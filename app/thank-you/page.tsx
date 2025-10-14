'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, TrendingUp, Calendar, Users, X, Filter, Mail, Phone, MapPin, Info, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type DateRange = {
  start: string;
  end: string;
};

export default function ThankYouPage() {
  const [allData, setAllData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRange | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<{ name: string; type: 'struxure' | 'deepwater' } | null>(null);
  const [isDealerModalOpen, setIsDealerModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncData = async () => {
    try {
      setIsSyncing(true);
      console.log('🔄 Syncing data from BigQuery to Redis...');
      
      const response = await fetch('/api/sync-cache', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Sync successful!');
        // Refetch data to show updated information
        await fetchData();
      } else {
        console.error('❌ Sync failed:', result.error);
        setError(result.error || 'Failed to sync data');
      }
    } catch (err) {
      console.error('❌ Error syncing data:', err);
      setError('Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch ALL data once (will be cached in Redis)
      const response = await fetch(`/api/bigquery-data?page=1&limit=100000`);
      const result = await response.json();

      if (!result.success) {
        if (result.cacheEmpty) {
          setError('Redis cache is empty. Please click "Refresh Data" button to load data from BigQuery.');
        } else {
          setError(result.error || 'Failed to fetch data');
        }
        return;
      }

      // Sort by timestamp DESC (newest first)
      const sortedData = result.data.sort((a: any, b: any) => {
        const dateA = new Date(a.Timestamp);
        const dateB = new Date(b.Timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      setAllData(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data by date range
  const filteredData = useMemo(() => {
    let filtered = allData;
    
    // Apply date filter
    if (dateFilter && dateFilter.start && dateFilter.end) {
      const startDate = new Date(dateFilter.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(item => {
        // Parse timestamp
        let itemDate;
        if (item.Timestamp) {
          const timestamp = item.Timestamp.toString();
          itemDate = new Date(timestamp);
          
          // Normalize to date only (ignore time)
          if (!isNaN(itemDate.getTime())) {
            const year = itemDate.getFullYear();
            const month = itemDate.getMonth();
            const day = itemDate.getDate();
            itemDate = new Date(year, month, day);
          }
        }
        
        // If invalid date, skip this item
        if (!itemDate || isNaN(itemDate.getTime())) {
          return false;
        }
        
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    return filtered;
  }, [allData, dateFilter]);

  // Calculate dealer statistics (based on filtered data)
  const dealerStats = useMemo(() => {
    if (filteredData.length === 0) return { struxure: {}, deepwater: {} };

    const struxureDealers: { [key: string]: number } = {};
    const deepwaterDealers: { [key: string]: number } = {};

    filteredData.forEach((item) => {
      if (item.Route_To === 'Struxure' && item.Struxure_Dealer) {
        // Ensure Struxure dealers have SX prefix
        let dealerName = item.Struxure_Dealer.trim();
        if (dealerName && !dealerName.startsWith('SX')) {
          dealerName = `SX ${dealerName}`;
        }
        struxureDealers[dealerName] = (struxureDealers[dealerName] || 0) + 1;
      } else if (item.Route_To === 'Deep Water' || item.Route_To === 'Deepwater') {
        // Get Deepwater dealer name and ensure SX prefix
        let dealerName = item.Deepwater_Dealer?.trim() || 'No Dealer Assigned';
        if (dealerName && dealerName !== 'No Dealer Assigned' && !dealerName.startsWith('SX')) {
          dealerName = `SX ${dealerName}`;
        }
        deepwaterDealers[dealerName] = (deepwaterDealers[dealerName] || 0) + 1;
      }
    });

    // Debug logging
    console.log('📊 Dealer Statistics:');
    console.log('Total Struxure dealers:', Object.keys(struxureDealers).length);
    console.log('Total Deepwater dealers:', Object.keys(deepwaterDealers).length);
    console.log('Sample Deepwater dealers:', Object.keys(deepwaterDealers).slice(0, 5));
    console.log('Sample Struxure dealers:', Object.keys(struxureDealers).slice(0, 5));

    return { struxure: struxureDealers, deepwater: deepwaterDealers };
  }, [filteredData]);

  // Calculate totals (based on filtered data - only assigned leads)
  const totalStruxureLeads = Object.values(dealerStats.struxure).reduce((sum, count) => sum + count, 0);
  const totalDeepwaterLeads = Object.values(dealerStats.deepwater).reduce((sum, count) => sum + count, 0);
  
  // Calculate total assigned leads from filtered data (only count leads with dealer assignments)
  const totalDeepwaterFromData = filteredData.filter(item => 
    (item.Route_To === 'Deep Water' || item.Route_To === 'Deepwater') && 
    item.Deepwater_Dealer && 
    item.Deepwater_Dealer.trim() !== ''
  ).length;
  const totalStruxureFromData = filteredData.filter(item => 
    item.Route_To === 'Struxure' && 
    item.Struxure_Dealer && 
    item.Struxure_Dealer.trim() !== ''
  ).length;

  // Sort dealers by lead count
  const sortedStruxureDealers = Object.entries(dealerStats.struxure)
    .sort(([, a], [, b]) => b - a);
  const sortedDeepwaterDealers = Object.entries(dealerStats.deepwater)
    .sort(([, a], [, b]) => b - a);

  // Prepare chart data
  const CHART_COLORS = ['#f97316', '#ec4899', '#eab308', '#14b8a6', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#06b6d4', '#84cc16'];
  
  const struxureChartData = sortedStruxureDealers.slice(0, 10).map(([name, value]) => ({
    name: name.replace('SX ', ''),
    value,
    fullName: name
  }));

  const deepwaterChartData = sortedDeepwaterDealers.slice(0, 10).map(([name, value]) => ({
    name: name.replace('SX ', ''),
    value,
    fullName: name
  }));

  // Date filter handlers
  const handleClearDateFilter = () => {
    setDateFilter(null);
  };

  const applyPresetFilter = (days: number) => {
    const end = new Date();
    end.setDate(end.getDate() - 1); // End yesterday, not today
    const start = new Date();
    start.setDate(start.getDate() - days); // Go back 'days' from today
    
    setDateFilter({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  // Handle dealer click to show modal
  const handleDealerClick = (dealerName: string, type: 'struxure' | 'deepwater') => {
    setSelectedDealer({ name: dealerName, type });
    setIsDealerModalOpen(true);
  };

  // Get leads for selected dealer (use filteredData if date filter is set, otherwise allData)
  const selectedDealerLeads = useMemo(() => {
    if (!selectedDealer) return [];
    
    // Use filteredData if date filter is active, otherwise use allData
    const dataSource = dateFilter ? filteredData : allData;
    
    return dataSource.filter(item => {
      if (selectedDealer.type === 'struxure') {
        let dealerName = item.Struxure_Dealer?.trim() || '';
        if (dealerName && !dealerName.startsWith('SX')) {
          dealerName = `SX ${dealerName}`;
        }
        return dealerName === selectedDealer.name;
      } else {
        let dealerName = item.Deepwater_Dealer?.trim() || '';
        if (dealerName && !dealerName.startsWith('SX')) {
          dealerName = `SX ${dealerName}`;
        }
        return dealerName === selectedDealer.name;
      }
    });
  }, [selectedDealer, dateFilter, filteredData, allData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
        <div className="text-center relative z-10">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-orange-500 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-orange-500/30 mx-auto"></div>
          </div>
          <p className="text-gray-300 mt-6 text-lg font-medium animate-pulse">Loading dealer data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent"></div>
        <div className="text-center relative z-10">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 backdrop-blur-sm">
            <div className="text-red-400 text-2xl mb-4 font-bold">Error</div>
            <p className="text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-900/10 via-transparent to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Report Header */}
        <div className="mb-8">
          <h2 className="text-5xl font-black text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text mb-3 tracking-tight">
            Struxure <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text">Website Leads</span> Report
          </h2>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-gray-300 font-medium">
                Showing assigned leads only • <span className="text-orange-400 font-bold">{(totalStruxureFromData + totalDeepwaterFromData).toLocaleString()}</span> leads with dealer assignments
              </p>
            </div>
            <div className="text-sm text-gray-400 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700/50">
              <span className="text-gray-500">Last Updated:</span> <span className="text-gray-300">{new Date().toLocaleString()}</span>
            </div>
          </div>
          
          {/* Refresh Data Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleSyncData}
              disabled={isSyncing}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Refreshing Data...' : 'Refresh Data'}
            </Button>
          </div>
        </div>

        {/* Date Filter */}
        <Card className="mb-8 bg-slate-900/40 backdrop-blur-xl border-slate-700/50 shadow-2xl">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-orange-500/10 rounded-xl">
                  <Calendar className="w-6 h-6 text-orange-400" />
                </div>
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Date Filter</span>
              </CardTitle>
              {dateFilter && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearDateFilter}
                  className="flex items-center gap-2 shadow-lg hover:shadow-red-500/50 transition-all duration-300"
                >
                  <X className="w-4 h-4" />
                  Clear Filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Quick Presets */}
            <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              <span className="text-sm text-gray-400 font-semibold">Quick Select:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter(7)}
                className="flex items-center gap-2 bg-slate-800/50 border-slate-600/50 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-300"
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter(30)}
                className="flex items-center gap-2 bg-slate-800/50 border-slate-600/50 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-300"
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter(60)}
                className="flex items-center gap-2 bg-slate-800/50 border-slate-600/50 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-300"
              >
                Last 60 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter(90)}
                className="flex items-center gap-2 bg-slate-800/50 border-slate-600/50 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-300"
              >
                Last 90 Days
              </Button>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-sm text-muted-foreground">From:</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateFilter?.start || ''}
                  onChange={(e) => setDateFilter(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-sm text-muted-foreground">To:</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateFilter?.end || ''}
                  onChange={(e) => setDateFilter(prev => ({ start: prev?.start || '', end: e.target.value }))}
                  className="w-auto"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Filter Display */}
        {dateFilter && (dateFilter.start || dateFilter.end) && (
          <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/40 rounded-2xl p-5 mb-8 backdrop-blur-sm shadow-xl shadow-orange-500/10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-xl">
                  <Filter className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-orange-300 font-bold text-lg">Active Date Filter</span>
              </div>
              <div className="text-sm text-orange-200 flex items-center gap-3 bg-orange-500/10 px-4 py-2 rounded-xl">
                {dateFilter.start && <span>From: <span className="font-bold text-orange-300">{new Date(dateFilter.start).toLocaleDateString()}</span></span>}
                {dateFilter.start && dateFilter.end && <span className="text-orange-400 mx-1">→</span>}
                {dateFilter.end && <span>To: <span className="font-bold text-orange-300">{new Date(dateFilter.end).toLocaleDateString()}</span></span>}
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Total Assigned Leads */}
          <div className="group relative bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-cyan-500/5 border border-cyan-500/40 rounded-2xl p-6 hover:border-cyan-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-cyan-400" />
                </div>
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg">
                  Total
                </Badge>
              </div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Total Assigned Leads</h3>
              <p className="text-5xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-2">{(totalStruxureFromData + totalDeepwaterFromData).toLocaleString()}</p>
              <p className="text-xs text-gray-400 font-medium">
                Only showing leads with dealer assignments
              </p>
            </div>
          </div>

          {/* Struxure Assigned Leads */}
          <div className="group relative bg-gradient-to-br from-orange-500/10 via-red-500/10 to-orange-500/5 border border-orange-500/40 rounded-2xl p-6 hover:border-orange-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Building className="w-8 h-8 text-orange-400" />
                </div>
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-lg">
                  Struxure
                </Badge>
              </div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Struxure Assigned</h3>
              <p className="text-5xl font-black text-transparent bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text mb-2">{totalStruxureFromData.toLocaleString()}</p>
              <p className="text-xs text-gray-400 font-medium">
                <span className="text-orange-400 font-bold">{Object.keys(dealerStats.struxure).length}</span> active dealers
              </p>
            </div>
          </div>

          {/* Deepwater Assigned Leads */}
          <div className="group relative bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-blue-500/5 border border-blue-500/40 rounded-2xl p-6 hover:border-blue-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-lg">
                  Deepwater
                </Badge>
              </div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Deepwater Assigned</h3>
              <p className="text-5xl font-black text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text mb-2">{totalDeepwaterFromData.toLocaleString()}</p>
              <p className="text-xs text-gray-400 font-medium">
                <span className="text-blue-400 font-bold">{Object.keys(dealerStats.deepwater).length}</span> active dealers
              </p>
            </div>
          </div>
        </div>

        {/* Struxure Dealers Section */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-10 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <Building className="w-7 h-7 text-orange-400" />
            </div>
            <h3 className="text-3xl font-black text-transparent bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text">Struxure Dealers Performance</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Statistics Column */}
            <div className="space-y-5">
              <div className="group relative bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl p-6 border border-orange-500/30 hover:border-orange-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <h4 className="text-lg font-bold text-gray-300 mb-4 uppercase tracking-wide">Assigned Leads</h4>
                  <div className="text-5xl font-black text-transparent bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text mb-2">{totalStruxureLeads.toLocaleString()}</div>
                  <p className="text-sm text-gray-400 font-medium">Leads assigned to dealers</p>
                </div>
              </div>

              {/* Top Dealers - Clickable */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 shadow-lg">
                <h4 className="text-lg font-bold text-gray-200 mb-5 uppercase tracking-wide">Top Performing Dealers</h4>
                <div className="space-y-2">
                  {sortedStruxureDealers.slice(0, 5).map(([dealer, count], index) => {
                    const displayName = dealer.startsWith('SX ') 
                      ? { prefix: 'SX', name: dealer.substring(3) }
                      : { prefix: '', name: dealer };
                    
                    return (
                      <div 
                        key={dealer} 
                        className="group flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-orange-500/5 cursor-pointer transition-all duration-300 border border-transparent hover:border-orange-500/30"
                        onClick={() => handleDealerClick(dealer, 'struxure')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/30">
                            <span className="text-xs font-bold text-orange-400">{index + 1}</span>
                          </div>
                          <span className="text-sm font-semibold text-white">
                            {displayName.prefix && (
                              <span className="text-orange-400 font-black">{displayName.prefix} </span>
                            )}
                            <span className="group-hover:text-orange-300 transition-colors duration-300">{displayName.name}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/40 group-hover:bg-orange-500/30 transition-colors duration-300 shadow-sm">
                            {count} leads
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-5 text-center font-medium bg-slate-900/50 py-2 px-3 rounded-lg">💡 Click on a dealer to view details</p>
              </div>
            </div>

            {/* Pie Chart with Legend */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 shadow-lg">
              <h4 className="text-lg font-bold text-gray-200 mb-6 uppercase tracking-wide">Distribution Chart</h4>
              <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={struxureChartData}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={false}
                      outerRadius={95}
                      fill="#8884d8"
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#0f172a"
                    >
                      {struxureChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569', 
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                      }}
                      labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Custom Legend */}
              <div className="mt-4 grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {struxureChartData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/30 transition-colors duration-200">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-lg" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    ></div>
                    <span className="text-xs text-gray-300 truncate font-medium" title={entry.fullName}>
                      {entry.name}
                    </span>
                    <span className="text-xs text-orange-400 ml-auto font-bold">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Deepwater Dealers Section */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-10 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Building className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-3xl font-black text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">Deepwater Dealers Performance</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Statistics Column */}
            <div className="space-y-5">
              <div className="group relative bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <h4 className="text-lg font-bold text-gray-300 mb-4 uppercase tracking-wide">Assigned Leads</h4>
                  <div className="text-5xl font-black text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text mb-2">{totalDeepwaterFromData.toLocaleString()}</div>
                  <p className="text-sm text-gray-400 font-medium">Leads assigned to dealers</p>
                </div>
              </div>

              {/* Top Dealers - Clickable */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 shadow-lg">
                <h4 className="text-lg font-bold text-gray-200 mb-5 uppercase tracking-wide">Top Performing Dealers</h4>
                {sortedDeepwaterDealers.length > 0 ? (
                  <div className="space-y-2">
                    {sortedDeepwaterDealers.slice(0, 5).map(([dealer, count], index) => {
                      const displayName = dealer.startsWith('SX ') 
                        ? { prefix: 'SX', name: dealer.substring(3) }
                        : { prefix: '', name: dealer };
                      
                      return (
                        <div 
                          key={dealer} 
                          className="group flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-500/5 cursor-pointer transition-all duration-300 border border-transparent hover:border-blue-500/30"
                          onClick={() => handleDealerClick(dealer, 'deepwater')}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-blue-500/30">
                              <span className="text-xs font-bold text-blue-400">{index + 1}</span>
                            </div>
                            <span className="text-sm font-semibold text-white">
                              {displayName.prefix && (
                                <span className="text-orange-400 font-black">{displayName.prefix} </span>
                              )}
                              <span className="group-hover:text-blue-300 transition-colors duration-300">{displayName.name}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/40 group-hover:bg-blue-500/30 transition-colors duration-300 shadow-sm">
                              {count} leads
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8 bg-slate-900/30 rounded-xl">
                    <p className="font-medium">No Deepwater dealer assignments found</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-5 text-center font-medium bg-slate-900/50 py-2 px-3 rounded-lg">💡 Click on a dealer to view details</p>
              </div>
            </div>

            {/* Pie Chart with Legend */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 shadow-lg">
              <h4 className="text-lg font-bold text-gray-200 mb-6 uppercase tracking-wide">Distribution Chart</h4>
              {deepwaterChartData.length > 0 ? (
                <>
                  <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={deepwaterChartData}
                          cx="50%"
                          cy="45%"
                          labelLine={false}
                          label={false}
                          outerRadius={95}
                          fill="#8884d8"
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#0f172a"
                        >
                          {deepwaterChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #475569', 
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                          }}
                          labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom Legend */}
                  <div className="mt-4 grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {deepwaterChartData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/30 transition-colors duration-200">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0 shadow-lg" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        ></div>
                        <span className="text-xs text-gray-300 truncate font-medium" title={entry.fullName}>
                          {entry.name}
                        </span>
                        <span className="text-xs text-blue-400 ml-auto font-bold">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 py-12 bg-slate-900/30 rounded-xl">
                  <p className="font-medium">No dealer data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 mb-8">
          <div className="inline-block bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-full px-6 py-3">
            <p className="text-sm text-gray-400 font-medium hover:text-orange-400 transition-colors duration-300 cursor-pointer">Privacy Policy</p>
          </div>
        </div>
      </main>

      {/* Dealer Detail Side Panel */}
      {isDealerModalOpen && (
        <>
          {/* Overlay - Darker to focus on panel */}
          <div 
            className="fixed inset-0 bg-black/90 z-40 transition-opacity backdrop-blur-md animate-fadeIn"
            onClick={() => setIsDealerModalOpen(false)}
          ></div>
          
          {/* Side Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-[90%] lg:w-[70%] xl:w-[60%] bg-slate-950 z-50 shadow-2xl overflow-y-auto transform transition-transform border-l border-slate-700/50">
            {/* Panel Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 p-6 z-10 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${selectedDealer?.type === 'struxure' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                    <Building className={`w-7 h-7 ${selectedDealer?.type === 'struxure' ? 'text-orange-400' : 'text-blue-400'}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white">
                    {selectedDealer?.name && (
                      <>
                        {selectedDealer.name.startsWith('SX ') ? (
                          <>
                            <span className="text-orange-400">SX</span> {selectedDealer.name.substring(3)}
                          </>
                        ) : (
                          selectedDealer.name
                        )}
                      </>
                    )}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDealerModalOpen(false)}
                  className="p-2.5 hover:bg-slate-700/50 rounded-xl transition-all duration-300 hover:scale-110"
                >
                  <X className="w-6 h-6 text-gray-300 hover:text-white transition-colors" />
                </button>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-gray-200 font-medium">
                  <span className={`text-2xl font-bold ${selectedDealer?.type === 'struxure' ? 'text-orange-400' : 'text-blue-400'}`}>{selectedDealerLeads.length}</span> lead{selectedDealerLeads.length !== 1 ? 's' : ''} found
                </p>
                <span className="text-xs text-gray-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                  {dateFilter 
                    ? `Filtered: ${new Date(dateFilter.start).toLocaleDateString()} - ${new Date(dateFilter.end).toLocaleDateString()}`
                    : 'All Historical Data'
                  }
                </span>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900">
              {selectedDealerLeads.length > 0 ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`group relative bg-gradient-to-br ${selectedDealer?.type === 'struxure' ? 'from-orange-500/10 to-red-500/10' : 'from-blue-500/10 to-purple-500/10'} rounded-2xl p-5 border ${selectedDealer?.type === 'struxure' ? 'border-orange-500/40' : 'border-blue-500/40'} hover:border-opacity-60 transition-all duration-300 hover:shadow-xl overflow-hidden`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-2 rounded-lg ${selectedDealer?.type === 'struxure' ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                            <Users className="w-5 h-5 text-gray-300" />
                          </div>
                          <span className="text-sm text-gray-300 font-bold uppercase tracking-wide">Total Leads</span>
                        </div>
                        <p className={`text-4xl font-black ${selectedDealer?.type === 'struxure' ? 'text-orange-400' : 'text-blue-400'}`}>{selectedDealerLeads.length}</p>
                        <p className="text-xs text-gray-400 mt-2 font-medium">
                          {dateFilter ? 'Filtered data' : 'All historical data'}
                        </p>
                      </div>
                    </div>
                    <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-5 border border-green-500/40 hover:border-opacity-60 transition-all duration-300 hover:shadow-xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <Building className="w-5 h-5 text-gray-300" />
                          </div>
                          <span className="text-sm text-gray-300 font-bold uppercase tracking-wide">Residential</span>
                        </div>
                        <p className="text-4xl font-black text-green-400">
                          {selectedDealerLeads.filter(l => l.Project_Type === 'Residential').length}
                        </p>
                      </div>
                    </div>
                    <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-5 border border-purple-500/40 hover:border-opacity-60 transition-all duration-300 hover:shadow-xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Building className="w-5 h-5 text-gray-300" />
                          </div>
                          <span className="text-sm text-gray-300 font-bold uppercase tracking-wide">Commercial</span>
                        </div>
                        <p className="text-4xl font-black text-purple-400">
                          {selectedDealerLeads.filter(l => l.Project_Type === 'Commercial').length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Leads Table */}
                  <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
                    {/* Table Header with Refresh Button */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Dealer Leads
                      </h4>
                      <Button
                        onClick={handleSyncData}
                        disabled={isSyncing}
                        size="sm"
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Refreshing...' : 'Refresh Data'}
                      </Button>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-slate-800 to-slate-700 sticky top-0 z-10 shadow-lg">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">UTM</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Route</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
                          {selectedDealerLeads.slice(0, 100).map((lead, idx) => (
                            <tr key={idx} className="hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-slate-800/30 transition-all duration-200">
                              <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap font-medium">
                                {new Date(lead.Timestamp).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-xs font-bold text-white">
                                  {lead.First_Name} {lead.Last_Name}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-gray-300 truncate max-w-[120px] font-medium" title={lead.Email}>
                                  {lead.Email || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-xs text-gray-300 font-medium">
                                  {lead.Phone || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-xs text-gray-300 font-medium">
                                  {lead.City}, {lead.State}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-gray-300 truncate max-w-[80px] font-medium" title={lead.UTM_Source}>
                                  {lead.UTM_Source || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs px-2 py-1 font-bold shadow-sm ${
                                    lead.Project_Type === 'Residential' 
                                    ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                                    : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  }`}
                                >
                                  {lead.Project_Type}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-2 py-1 bg-slate-700/50 text-gray-300 border-slate-600/50 font-medium"
                                >
                                  {lead.Route_To}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selectedDealerLeads.length > 100 && (
                      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-5 py-3 text-center border-t border-slate-700/50">
                        <span className="text-xs text-gray-300 font-bold">
                          Showing first 100 of <span className="text-orange-400">{selectedDealerLeads.length}</span> leads
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-700/50">
                  <div className="p-4 bg-slate-800/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Info className="w-10 h-10 text-gray-500" />
                  </div>
                  <p className="text-gray-300 font-medium text-lg">No leads found for this dealer</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
