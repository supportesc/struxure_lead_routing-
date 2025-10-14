'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, TrendingUp, TrendingDown, Users, Building, Link, RefreshCw, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type DateRange = {
  start: string;
  end: string;
};

export default function LeadSourceComparisons() {
  const [allData, setAllData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Current year date range
  const [currentYearRange, setCurrentYearRange] = useState<DateRange>({
    start: `${new Date().getFullYear()}-01-01`,
    end: `${new Date().getFullYear()}-12-31`
  });
  
  // Last year date range
  const [lastYearRange, setLastYearRange] = useState<DateRange>({
    start: `${new Date().getFullYear() - 1}-01-01`,
    end: `${new Date().getFullYear() - 1}-12-31`
  });

  // Quick filter functions
  const applyLast7Days = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const lastYearToday = new Date(today);
    lastYearToday.setFullYear(today.getFullYear() - 1);
    const lastYearSevenDaysAgo = new Date(sevenDaysAgo);
    lastYearSevenDaysAgo.setFullYear(sevenDaysAgo.getFullYear() - 1);
    
    setCurrentYearRange({
      start: sevenDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    });
    
    setLastYearRange({
      start: lastYearSevenDaysAgo.toISOString().split('T')[0],
      end: lastYearToday.toISOString().split('T')[0]
    });
  };

  const applyLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const lastYearToday = new Date(today);
    lastYearToday.setFullYear(today.getFullYear() - 1);
    const lastYearThirtyDaysAgo = new Date(thirtyDaysAgo);
    lastYearThirtyDaysAgo.setFullYear(thirtyDaysAgo.getFullYear() - 1);
    
    setCurrentYearRange({
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    });
    
    setLastYearRange({
      start: lastYearThirtyDaysAgo.toISOString().split('T')[0],
      end: lastYearToday.toISOString().split('T')[0]
    });
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 [CLIENT] Starting data fetch for comparisons...');
      const startTime = performance.now();
      
      const response = await fetch(`/api/bigquery-data?page=1&limit=100000`);
      const fetchTime = performance.now() - startTime;
      console.log(`📡 [CLIENT] Fetch completed in ${fetchTime.toFixed(0)}ms`);
      
      const parseStart = performance.now();
      const result = await response.json();
      const parseTime = performance.now() - parseStart;
      console.log(`📊 [CLIENT] JSON parse completed in ${parseTime.toFixed(0)}ms`);

      if (!result.success) {
        setError(result.error || 'Failed to fetch data');
        return;
      }

      console.log(`📦 [CLIENT] Received ${result.data.length.toLocaleString()} rows from server`);
      
      const sortStart = performance.now();
      const sortedData = result.data.sort((a: any, b: any) => {
        const dateA = new Date(a.Timestamp);
        const dateB = new Date(b.Timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      const sortTime = performance.now() - sortStart;
      console.log(`⏱️ [CLIENT] Sort completed in ${sortTime.toFixed(0)}ms`);

      setAllData(sortedData);
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ [CLIENT] Total page load time: ${totalTime.toFixed(0)}ms`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('❌ [CLIENT] Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncData = async () => {
    try {
      setIsSyncing(true);
      console.log('🔄 Syncing data from BigQuery to Redis...');
      
      const response = await fetch('/api/sync-cache', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Sync successful!');
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

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data by date range
  const filterDataByRange = (data: any[], range: DateRange) => {
    if (!range.start || !range.end) return [];
    
    const startDate = new Date(range.start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(range.end);
    endDate.setHours(23, 59, 59, 999);
    
    return data.filter(item => {
      if (!item.Timestamp) return false;
      
      const itemDate = new Date(item.Timestamp);
      if (isNaN(itemDate.getTime())) return false;
      
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const currentYearData = useMemo(() => 
    filterDataByRange(allData, currentYearRange), 
    [allData, currentYearRange]
  );

  const lastYearData = useMemo(() => 
    filterDataByRange(allData, lastYearRange), 
    [allData, lastYearRange]
  );

  // Route statistics
  const routeStats = useMemo(() => {
    const current = {
      struxure: currentYearData.filter(item => item.Route_To === 'Struxure').length,
      deepwater: currentYearData.filter(item => item.Route_To === 'Deep Water' || item.Route_To === 'Deepwater').length,
      total: currentYearData.length
    };
    
    const last = {
      struxure: lastYearData.filter(item => item.Route_To === 'Struxure').length,
      deepwater: lastYearData.filter(item => item.Route_To === 'Deep Water' || item.Route_To === 'Deepwater').length,
      total: lastYearData.length
    };
    
    return { current, last };
  }, [currentYearData, lastYearData]);

  // Project Type statistics
  const projectTypeStats = useMemo(() => {
    const current = {
      residential: currentYearData.filter(item => item.Project_Type === 'Residential').length,
      commercial: currentYearData.filter(item => item.Project_Type === 'Commercial').length,
      total: currentYearData.length
    };
    
    const last = {
      residential: lastYearData.filter(item => item.Project_Type === 'Residential').length,
      commercial: lastYearData.filter(item => item.Project_Type === 'Commercial').length,
      total: lastYearData.length
    };
    
    return { current, last };
  }, [currentYearData, lastYearData]);

  // UTM Source statistics
  const utmSourceStats = useMemo(() => {
    const countBySource = (data: any[]) => {
      const sources: { [key: string]: number } = {};
      data.forEach(item => {
        if (item.UTM_Source) {
          sources[item.UTM_Source] = (sources[item.UTM_Source] || 0) + 1;
        }
      });
      return sources;
    };
    
    const current = countBySource(currentYearData);
    const last = countBySource(lastYearData);
    
    return { current, last };
  }, [currentYearData, lastYearData]);

  // Calculate percentage change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Prepare chart data
  const routeChartData = [
    {
      name: 'Struxure',
      'Current Year': routeStats.current.struxure,
      'Last Year': routeStats.last.struxure
    },
    {
      name: 'Deepwater',
      'Current Year': routeStats.current.deepwater,
      'Last Year': routeStats.last.deepwater
    }
  ];

  const projectTypeChartData = [
    {
      name: 'Residential',
      'Current Year': projectTypeStats.current.residential,
      'Last Year': projectTypeStats.last.residential
    },
    {
      name: 'Commercial',
      'Current Year': projectTypeStats.current.commercial,
      'Last Year': projectTypeStats.last.commercial
    }
  ];

  // Top 10 UTM sources comparison
  const topUTMSources = useMemo(() => {
    const allSources = new Set([
      ...Object.keys(utmSourceStats.current),
      ...Object.keys(utmSourceStats.last)
    ]);
    
    return Array.from(allSources)
      .map(source => ({
        name: source,
        'Current Year': utmSourceStats.current[source] || 0,
        'Last Year': utmSourceStats.last[source] || 0
      }))
      .sort((a, b) => b['Current Year'] - a['Current Year'])
      .slice(0, 10);
  }, [utmSourceStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        <div className="text-center relative z-10">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-purple-500 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-purple-500/30 mx-auto"></div>
          </div>
          <p className="text-gray-300 mt-6 text-lg font-medium animate-pulse">Loading comparison data...</p>
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
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-5xl font-black text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text mb-3 tracking-tight">
            Lead Source <span className="text-transparent bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text">Comparisons</span>
          </h2>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-gray-300 font-medium">
                Year-over-year comparison • <span className="text-purple-400 font-bold">{currentYearData.length.toLocaleString()}</span> current leads vs <span className="text-blue-400 font-bold">{lastYearData.length.toLocaleString()}</span> last year
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

        {/* Date Range Selectors */}
        <Card className="mb-8 bg-slate-900/40 backdrop-blur-xl border-slate-700/50 shadow-2xl">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-purple-500/10 rounded-xl">
                <Calendar className="w-6 h-6 text-purple-400" />
              </div>
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Date Range Selection</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Quick Filter Buttons */}
            <div className="flex items-center justify-center gap-3 mb-6 pb-6 border-b border-slate-700/50">
              <span className="text-sm text-gray-400 font-semibold">Quick Filters:</span>
              <Button
                onClick={applyLast7Days}
                variant="outline"
                size="sm"
                className="bg-slate-800/50 border-slate-600/50 hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-400 transition-all duration-300"
              >
                Last 7 Days (YoY)
              </Button>
              <Button
                onClick={applyLast30Days}
                variant="outline"
                size="sm"
                className="bg-slate-800/50 border-slate-600/50 hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-400 transition-all duration-300"
              >
                Last 30 Days (YoY)
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Current Year Range */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Current Year Range
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="current-start" className="text-sm text-gray-300 mb-2 block">Start Date</Label>
                    <Input
                      id="current-start"
                      type="date"
                      value={currentYearRange.start}
                      onChange={(e) => setCurrentYearRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="current-end" className="text-sm text-gray-300 mb-2 block">End Date</Label>
                    <Input
                      id="current-end"
                      type="date"
                      value={currentYearRange.end}
                      onChange={(e) => setCurrentYearRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Last Year Range */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Comparison Year Range
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="last-start" className="text-sm text-gray-300 mb-2 block">Start Date</Label>
                    <Input
                      id="last-start"
                      type="date"
                      value={lastYearRange.start}
                      onChange={(e) => setLastYearRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last-end" className="text-sm text-gray-300 mb-2 block">End Date</Label>
                    <Input
                      id="last-end"
                      type="date"
                      value={lastYearRange.end}
                      onChange={(e) => setLastYearRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Comparison */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-10 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <Users className="w-7 h-7 text-orange-400" />
            </div>
            <h3 className="text-3xl font-black text-transparent bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text">Route Comparison</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Stats Cards */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl p-6 border border-orange-500/30">
                <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase">Struxure Leads</h4>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs text-purple-300 mb-1">Current Year</p>
                    <p className="text-4xl font-black text-purple-400">{routeStats.current.struxure.toLocaleString()}</p>
                  </div>
                  <div className="mb-2">
                    <TrendingUp className={`w-6 h-6 ${calculateChange(routeStats.current.struxure, routeStats.last.struxure) >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-blue-300 mb-1">Last Year</p>
                    <p className="text-3xl font-black text-blue-400">{routeStats.last.struxure.toLocaleString()}</p>
                  </div>
                </div>
                <p className={`text-sm mt-3 font-bold ${calculateChange(routeStats.current.struxure, routeStats.last.struxure) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculateChange(routeStats.current.struxure, routeStats.last.struxure) >= 0 ? '↑' : '↓'} {Math.abs(calculateChange(routeStats.current.struxure, routeStats.last.struxure)).toFixed(1)}% change
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/30">
                <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase">Deepwater Leads</h4>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs text-purple-300 mb-1">Current Year</p>
                    <p className="text-4xl font-black text-purple-400">{routeStats.current.deepwater.toLocaleString()}</p>
                  </div>
                  <div className="mb-2">
                    {calculateChange(routeStats.current.deepwater, routeStats.last.deepwater) >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-blue-300 mb-1">Last Year</p>
                    <p className="text-3xl font-black text-blue-400">{routeStats.last.deepwater.toLocaleString()}</p>
                  </div>
                </div>
                <p className={`text-sm mt-3 font-bold ${calculateChange(routeStats.current.deepwater, routeStats.last.deepwater) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculateChange(routeStats.current.deepwater, routeStats.last.deepwater) >= 0 ? '↑' : '↓'} {Math.abs(calculateChange(routeStats.current.deepwater, routeStats.last.deepwater)).toFixed(1)}% change
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50">
              <h4 className="text-lg font-bold text-gray-200 mb-4">Route Distribution</h4>
              {routeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={routeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="Current Year" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Last Year" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Type Comparison */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-10 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <Building className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-3xl font-black text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">Project Type Comparison</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Stats Cards */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-500/30">
                <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase">Residential Projects</h4>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs text-purple-300 mb-1">Current Year</p>
                    <p className="text-4xl font-black text-purple-400">{projectTypeStats.current.residential.toLocaleString()}</p>
                  </div>
                  <div className="mb-2">
                    {calculateChange(projectTypeStats.current.residential, projectTypeStats.last.residential) >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-blue-300 mb-1">Last Year</p>
                    <p className="text-3xl font-black text-blue-400">{projectTypeStats.last.residential.toLocaleString()}</p>
                  </div>
                </div>
                <p className={`text-sm mt-3 font-bold ${calculateChange(projectTypeStats.current.residential, projectTypeStats.last.residential) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculateChange(projectTypeStats.current.residential, projectTypeStats.last.residential) >= 0 ? '↑' : '↓'} {Math.abs(calculateChange(projectTypeStats.current.residential, projectTypeStats.last.residential)).toFixed(1)}% change
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-amber-500/30">
                <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase">Commercial Projects</h4>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs text-purple-300 mb-1">Current Year</p>
                    <p className="text-4xl font-black text-purple-400">{projectTypeStats.current.commercial.toLocaleString()}</p>
                  </div>
                  <div className="mb-2">
                    {calculateChange(projectTypeStats.current.commercial, projectTypeStats.last.commercial) >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-blue-300 mb-1">Last Year</p>
                    <p className="text-3xl font-black text-blue-400">{projectTypeStats.last.commercial.toLocaleString()}</p>
                  </div>
                </div>
                <p className={`text-sm mt-3 font-bold ${calculateChange(projectTypeStats.current.commercial, projectTypeStats.last.commercial) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculateChange(projectTypeStats.current.commercial, projectTypeStats.last.commercial) >= 0 ? '↑' : '↓'} {Math.abs(calculateChange(projectTypeStats.current.commercial, projectTypeStats.last.commercial)).toFixed(1)}% change
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50">
              <h4 className="text-lg font-bold text-gray-200 mb-4">Project Type Distribution</h4>
              {projectTypeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectTypeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="Current Year" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Last Year" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* UTM Source Comparison */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-10 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <Link className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-3xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">UTM Source Comparison</h3>
            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300">
              Top 10 Sources
            </Badge>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50">
            {topUTMSources.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={topUTMSources} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={150} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="Current Year" fill="#a855f7" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Last Year" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[500px] flex items-center justify-center text-gray-400">
                <p>No data available for the selected date range</p>
              </div>
            )}
          </div>

          {/* UTM Source Table */}
          <div className="mt-6 bg-slate-800/30 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase">UTM Source</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-purple-300 uppercase">Current Year</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-blue-300 uppercase">Last Year</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-200 uppercase">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {topUTMSources.map((source, idx) => {
                  const change = calculateChange(source['Current Year'], source['Last Year']);
                  return (
                    <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white font-medium">{source.name}</td>
                      <td className="px-4 py-3 text-center text-sm text-purple-300 font-bold">{source['Current Year'].toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-blue-300 font-bold">{source['Last Year'].toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

