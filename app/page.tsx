'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, X, Calendar, BarChart3, Users, Building, Link, Megaphone, ChevronDown, Check, RefreshCw, Settings2, SlidersHorizontal } from 'lucide-react';

type DateRange = {
  start: string;
  end: string;
};

export default function Home() {
  const [allData, setAllData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [dateFilter, setDateFilter] = useState<DateRange | null>(null);
  const [compareDateFilter, setCompareDateFilter] = useState<DateRange | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [columnFilterOpen, setColumnFilterOpen] = useState(false);

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
      
      console.log('🚀 [CLIENT] Starting data fetch...');
      const startTime = performance.now();
      
      // Fetch ALL data once (will be cached in Redis)
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
      
      // Sort by timestamp DESC (newest first) - BigQuery sorts strings wrong
      const sortStart = performance.now();
      const sortedData = result.data.sort((a: any, b: any) => {
        const dateA = new Date(a.Timestamp);
        const dateB = new Date(b.Timestamp);
        return dateB.getTime() - dateA.getTime(); // DESC order
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

  useEffect(() => {
    fetchData();
  }, []);

  const [columnFilters, setColumnFilters] = useState<{
    routeTo: string[];
    projectType: string[];
    utmSource: string[];
    campaign: string[];
  }>({
    routeTo: [],
    projectType: [],
    utmSource: [],
    campaign: []
  });

  // Filter data by date range and column filters
  const filteredData = useMemo(() => {
    let filtered = allData;
    
    // Apply date filter
    if (dateFilter && dateFilter.start && dateFilter.end) {
      const startDate = new Date(dateFilter.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(item => {
        // Parse timestamp - format is "M/D/YYYY H:mm:ss"
        let itemDate;
        if (item.Timestamp) {
          const timestamp = item.Timestamp.toString();
          // Create date and normalize to start of day for comparison
          itemDate = new Date(timestamp);
          
          // If date is valid, normalize to local timezone date only (ignore time)
          if (!isNaN(itemDate.getTime())) {
            // Get just the date part in local timezone
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
    
    // Apply Route To filter
    if (columnFilters.routeTo.length > 0) {
      filtered = filtered.filter(item => 
        columnFilters.routeTo.includes(item.Route_To)
      );
    }
    
    // Apply Project Type filter
    if (columnFilters.projectType.length > 0) {
      filtered = filtered.filter(item => 
        columnFilters.projectType.includes(item.Project_Type)
      );
    }
    
    // Apply UTM Source filter
    if (columnFilters.utmSource.length > 0) {
      filtered = filtered.filter(item => 
        columnFilters.utmSource.includes(item.UTM_Source)
      );
    }
    
    // Apply Campaign filter
    if (columnFilters.campaign.length > 0) {
      filtered = filtered.filter(item => 
        columnFilters.campaign.includes(item.Campaign)
      );
    }
    
    return filtered;
  }, [allData, dateFilter, columnFilters]);

  // Filter compare data
  const compareData = useMemo(() => {
    if (!compareDateFilter || !compareDateFilter.start || !compareDateFilter.end) return null;
    
    const startDate = new Date(compareDateFilter.start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(compareDateFilter.end);
    endDate.setHours(23, 59, 59, 999);
    
    return allData.filter(item => {
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
      
      if (!itemDate || isNaN(itemDate.getTime())) {
        return false;
      }
      
      return itemDate >= startDate && itemDate <= endDate;
    });
  }, [allData, compareDateFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const struxureLeads = filteredData.filter(item => item.Route_To === 'Struxure').length;
    const deepwaterLeads = filteredData.filter(item => item.Route_To === 'Deep Water').length;
    const residentialLeads = filteredData.filter(item => item.Project_Type === 'Residential').length;
    const commercialLeads = filteredData.filter(item => item.Project_Type === 'Commercial').length;
    
    // UTM Source stats
    const organicLeads = filteredData.filter(item => 
      item.UTM_Source?.toLowerCase().includes('organic') || 
      item.UTM_Source?.toLowerCase().includes('direct')
    ).length;
    const facebookLeads = filteredData.filter(item => 
      item.UTM_Source?.toLowerCase().includes('facebook') || 
      item.UTM_Source?.toLowerCase().includes('fb')
    ).length;
    const googleLeads = filteredData.filter(item => 
      item.UTM_Source?.toLowerCase().includes('google')
    ).length;
    const youtubeLeads = filteredData.filter(item => 
      item.UTM_Source?.toLowerCase().includes('youtube')
    ).length;
    
    return {
      struxure: struxureLeads,
      deepwater: deepwaterLeads,
      residential: residentialLeads,
      commercial: commercialLeads,
      organic: organicLeads,
      facebook: facebookLeads,
      google: googleLeads,
      youtube: youtubeLeads,
      total: filteredData.length
    };
  }, [filteredData]);

  // Calculate compare statistics
  const compareStats = useMemo(() => {
    if (!compareData) return null;
    
    const struxureLeads = compareData.filter(item => item.Route_To === 'Struxure').length;
    const deepwaterLeads = compareData.filter(item => item.Route_To === 'Deep Water').length;
    const residentialLeads = compareData.filter(item => item.Project_Type === 'Residential').length;
    const commercialLeads = compareData.filter(item => item.Project_Type === 'Commercial').length;
    
    const organicLeads = compareData.filter(item => 
      item.UTM_Source?.toLowerCase().includes('organic') || 
      item.UTM_Source?.toLowerCase().includes('direct')
    ).length;
    const facebookLeads = compareData.filter(item => 
      item.UTM_Source?.toLowerCase().includes('facebook') || 
      item.UTM_Source?.toLowerCase().includes('fb')
    ).length;
    const googleLeads = compareData.filter(item => 
      item.UTM_Source?.toLowerCase().includes('google')
    ).length;
    const youtubeLeads = compareData.filter(item => 
      item.UTM_Source?.toLowerCase().includes('youtube')
    ).length;
    
    return {
      struxure: struxureLeads,
      deepwater: deepwaterLeads,
      residential: residentialLeads,
      commercial: commercialLeads,
      organic: organicLeads,
      facebook: facebookLeads,
      google: googleLeads,
      youtube: youtubeLeads,
      total: compareData.length
    };
  }, [compareData]);

  // Paginate filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleClearDateFilter = () => {
    setDateFilter(null);
    setCompareDateFilter(null);
    setShowCompare(false);
  };

  const handleClearAllFilters = () => {
    setDateFilter(null);
    setCompareDateFilter(null);
    setShowCompare(false);
    setColumnFilters({
      routeTo: [],
      projectType: [],
      utmSource: [],
      campaign: []
    });
  };

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    return {
      routeTo: Array.from(new Set(allData.map(item => item.Route_To).filter(Boolean))).sort(),
      projectType: Array.from(new Set(allData.map(item => item.Project_Type).filter(Boolean))).sort(),
      utmSource: Array.from(new Set(allData.map(item => item.UTM_Source).filter(Boolean))).sort(),
      campaign: Array.from(new Set(allData.map(item => item.Campaign).filter(Boolean))).sort().slice(0, 20) // Limit to top 20
    };
  }, [allData]);

  const hasActiveFilters = dateFilter || columnFilters.routeTo.length > 0 || columnFilters.projectType.length > 0 || 
    columnFilters.utmSource.length > 0 || columnFilters.campaign.length > 0;

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

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
        <div className="text-center relative z-10">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-cyan-500 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-cyan-500/30 mx-auto"></div>
          </div>
          <p className="text-gray-300 mt-6 text-lg font-medium animate-pulse">Loading leads...</p>
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Data Info Header */}
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-600 bg-clip-text text-transparent">
              Lead Management
            </span>
          </h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <p className="text-gray-300 font-medium">
              {dateFilter ? (
                <>
                  Filtered: <span className="text-cyan-400 font-bold">{stats.total.toLocaleString()}</span> of <span className="text-gray-400">{allData.length.toLocaleString()}</span> total leads
                </>
              ) : (
                <>
                  <span className="text-cyan-400 font-bold">{allData.length.toLocaleString()}</span> total leads
                </>
              )}
            </p>
          </div>
          
          {/* Refresh Data Button */}
          <Button
            onClick={handleSyncData}
            disabled={isSyncing}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Refreshing Data...' : 'Refresh Data'}
          </Button>
        </div>

        {/* Filter Controls - Clean Button Interface */}
        <div className="mb-8 flex items-center gap-4 flex-wrap">
          {/* Date Filter Button */}
          <Sheet open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <SheetTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 border border-slate-600/50"
                size="lg"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Date Filter
                {dateFilter && (
                  <Badge className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    Active
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[500px] sm:w-[600px] bg-slate-900/95 backdrop-blur-xl border-slate-700/50 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-cyan-500/10 rounded-xl">
                    <Calendar className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Date Filter</span>
                </SheetTitle>
                <SheetDescription className="text-gray-400">
                  Filter leads by date range or compare different periods
                </SheetDescription>
              </SheetHeader>

              <div className="mt-8 space-y-6">
                {/* Quick Presets */}
                <div>
                  <Label className="text-sm text-gray-400 font-semibold mb-3 block">Quick Select:</Label>
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        applyPresetFilter(7);
                        setDateFilterOpen(false);
                      }}
                      className="w-full justify-start bg-slate-800/50 border-slate-600/50 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Last 7 Days
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        applyPresetFilter(30);
                        setDateFilterOpen(false);
                      }}
                      className="w-full justify-start bg-slate-800/50 border-slate-600/50 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Last 30 Days
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        applyPresetFilter(60);
                        setDateFilterOpen(false);
                      }}
                      className="w-full justify-start bg-slate-800/50 border-slate-600/50 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Last 60 Days
                    </Button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700/50"></div>

                {/* Custom Date Range */}
                <div>
                  <Label className="text-sm text-gray-400 font-semibold mb-3 block">Custom Date Range:</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date" className="text-sm text-gray-300">From Date:</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={dateFilter?.start || ''}
                        onChange={(e) => setDateFilter(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                        className="w-full bg-slate-800/50 border-slate-600/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date" className="text-sm text-gray-300">To Date:</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={dateFilter?.end || ''}
                        onChange={(e) => setDateFilter(prev => ({ start: prev?.start || '', end: e.target.value }))}
                        className="w-full bg-slate-800/50 border-slate-600/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700/50"></div>

                {/* Compare Toggle */}
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setShowCompare(!showCompare)}
                    className="w-full justify-start bg-slate-800/50 border-slate-600/50 hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-400 transition-all duration-300"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {showCompare ? 'Hide Compare Mode' : 'Enable Compare Mode'}
                  </Button>
                </div>

                {/* Compare Date Range */}
                {showCompare && (
                  <div className="space-y-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                    <Label className="text-sm text-purple-300 font-semibold">Compare Period:</Label>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="compare-start" className="text-sm text-gray-300">From Date:</Label>
                        <Input
                          id="compare-start"
                          type="date"
                          value={compareDateFilter?.start || ''}
                          onChange={(e) => setCompareDateFilter(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                          className="w-full bg-purple-900/20 border-purple-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="compare-end" className="text-sm text-gray-300">To Date:</Label>
                        <Input
                          id="compare-end"
                          type="date"
                          value={compareDateFilter?.end || ''}
                          onChange={(e) => setCompareDateFilter(prev => ({ start: prev?.start || '', end: e.target.value }))}
                          className="w-full bg-purple-900/20 border-purple-500/30"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {dateFilter && (
                  <div className="pt-4">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleClearDateFilter();
                        setDateFilterOpen(false);
                      }}
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Date Filter
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Column Filter Button */}
          <Sheet open={columnFilterOpen} onOpenChange={setColumnFilterOpen}>
            <SheetTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 border border-slate-600/50"
                size="lg"
              >
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                Column Filters
                {(columnFilters.routeTo.length > 0 || columnFilters.projectType.length > 0 || columnFilters.utmSource.length > 0 || columnFilters.campaign.length > 0) && (
                  <Badge className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    {columnFilters.routeTo.length + columnFilters.projectType.length + columnFilters.utmSource.length + columnFilters.campaign.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[500px] sm:w-[600px] bg-slate-900/95 backdrop-blur-xl border-slate-700/50 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-cyan-500/10 rounded-xl">
                    <Filter className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Column Filters</span>
                </SheetTitle>
                <SheetDescription className="text-gray-400">
                  Filter leads by specific column values
                </SheetDescription>
              </SheetHeader>

              <div className="mt-8 space-y-6">
                {/* Route To Filter */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-semibold text-white">
                    <Users className="w-5 h-5 text-blue-400" />
                    Route To
                    {columnFilters.routeTo.length > 0 && (
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                        {columnFilters.routeTo.length}
                      </Badge>
                    )}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between bg-slate-800/50 border-slate-600/50">
                        {columnFilters.routeTo.length > 0 
                          ? `${columnFilters.routeTo.length} selected` 
                          : "Select Route To"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search route..." />
                        <CommandList>
                          <CommandEmpty>No route found.</CommandEmpty>
                          <CommandGroup>
                            {filterOptions.routeTo.map(option => {
                              const count = allData.filter(item => item.Route_To === option).length;
                              const isSelected = columnFilters.routeTo.includes(option);
                              return (
                                <CommandItem
                                  key={option}
                                  onSelect={() => {
                                    if (isSelected) {
                                      setColumnFilters(prev => ({ ...prev, routeTo: prev.routeTo.filter(item => item !== option) }));
                                    } else {
                                      setColumnFilters(prev => ({ ...prev, routeTo: [...prev.routeTo, option] }));
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <Checkbox
                                      checked={isSelected}
                                      className="pointer-events-none"
                                    />
                                    <span className="flex-1">{option}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {count.toLocaleString()}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Project Type Filter */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-semibold text-white">
                    <Building className="w-5 h-5 text-green-400" />
                    Project Type
                    {columnFilters.projectType.length > 0 && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                        {columnFilters.projectType.length}
                      </Badge>
                    )}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between bg-slate-800/50 border-slate-600/50">
                        {columnFilters.projectType.length > 0 
                          ? `${columnFilters.projectType.length} selected` 
                          : "Select Project Type"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search project type..." />
                        <CommandList>
                          <CommandEmpty>No project type found.</CommandEmpty>
                          <CommandGroup>
                            {filterOptions.projectType.map(option => {
                              const count = allData.filter(item => item.Project_Type === option).length;
                              const isSelected = columnFilters.projectType.includes(option);
                              return (
                                <CommandItem
                                  key={option}
                                  onSelect={() => {
                                    if (isSelected) {
                                      setColumnFilters(prev => ({ ...prev, projectType: prev.projectType.filter(item => item !== option) }));
                                    } else {
                                      setColumnFilters(prev => ({ ...prev, projectType: [...prev.projectType, option] }));
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <Checkbox
                                      checked={isSelected}
                                      className="pointer-events-none"
                                    />
                                    <span className="flex-1">{option}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {count.toLocaleString()}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* UTM Source Filter */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-semibold text-white">
                    <Link className="w-5 h-5 text-purple-400" />
                    UTM Source
                    {columnFilters.utmSource.length > 0 && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                        {columnFilters.utmSource.length}
                      </Badge>
                    )}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between bg-slate-800/50 border-slate-600/50">
                        {columnFilters.utmSource.length > 0 
                          ? `${columnFilters.utmSource.length} selected` 
                          : "Select UTM Source"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search UTM source..." />
                        <CommandList>
                          <CommandEmpty>No UTM source found.</CommandEmpty>
                          <CommandGroup>
                            {filterOptions.utmSource.map(option => {
                              const count = allData.filter(item => item.UTM_Source === option).length;
                              const isSelected = columnFilters.utmSource.includes(option);
                              return (
                                <CommandItem
                                  key={option}
                                  onSelect={() => {
                                    if (isSelected) {
                                      setColumnFilters(prev => ({ ...prev, utmSource: prev.utmSource.filter(item => item !== option) }));
                                    } else {
                                      setColumnFilters(prev => ({ ...prev, utmSource: [...prev.utmSource, option] }));
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <Checkbox
                                      checked={isSelected}
                                      className="pointer-events-none"
                                    />
                                    <span className="flex-1">{option}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {count.toLocaleString()}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Campaign Filter */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-semibold text-white">
                    <Megaphone className="w-5 h-5 text-orange-400" />
                    Campaign
                    {columnFilters.campaign.length > 0 && (
                      <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
                        {columnFilters.campaign.length}
                      </Badge>
                    )}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between bg-slate-800/50 border-slate-600/50">
                        {columnFilters.campaign.length > 0 
                          ? `${columnFilters.campaign.length} selected` 
                          : "Select Campaign"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search campaign..." />
                        <CommandList>
                          <CommandEmpty>No campaign found.</CommandEmpty>
                          <CommandGroup>
                            {filterOptions.campaign.map(option => {
                              const count = allData.filter(item => item.Campaign === option).length;
                              const isSelected = columnFilters.campaign.includes(option);
                              return (
                                <CommandItem
                                  key={option}
                                  onSelect={() => {
                                    if (isSelected) {
                                      setColumnFilters(prev => ({ ...prev, campaign: prev.campaign.filter(item => item !== option) }));
                                    } else {
                                      setColumnFilters(prev => ({ ...prev, campaign: [...prev.campaign, option] }));
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <Checkbox
                                      checked={isSelected}
                                      className="pointer-events-none"
                                    />
                                    <span className="flex-1 truncate" title={option}>{option}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {count.toLocaleString()}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                  <div className="pt-6 border-t border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                      <Filter className="w-5 h-5 text-cyan-400" />
                      <h4 className="text-base font-semibold text-white">Active Filters</h4>
                      <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300">
                        {columnFilters.routeTo.length + columnFilters.projectType.length + columnFilters.utmSource.length + columnFilters.campaign.length}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {columnFilters.routeTo.map(filter => (
                        <Badge key={filter} variant="secondary" className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors">
                          <Users className="w-3 h-3 mr-1" />
                          {filter}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setColumnFilters(prev => ({ ...prev, routeTo: prev.routeTo.filter(f => f !== filter) }))}
                            className="ml-2 h-auto p-0 hover:bg-transparent"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                      {columnFilters.projectType.map(filter => (
                        <Badge key={filter} variant="secondary" className="bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors">
                          <Building className="w-3 h-3 mr-1" />
                          {filter}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setColumnFilters(prev => ({ ...prev, projectType: prev.projectType.filter(f => f !== filter) }))}
                            className="ml-2 h-auto p-0 hover:bg-transparent"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                      {columnFilters.utmSource.map(filter => (
                        <Badge key={filter} variant="secondary" className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors">
                          <Link className="w-3 h-3 mr-1" />
                          {filter}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setColumnFilters(prev => ({ ...prev, utmSource: prev.utmSource.filter(f => f !== filter) }))}
                            className="ml-2 h-auto p-0 hover:bg-transparent"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                      {columnFilters.campaign.map(filter => (
                        <Badge key={filter} variant="secondary" className="bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors">
                          <Megaphone className="w-3 h-3 mr-1" />
                          {filter}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setColumnFilters(prev => ({ ...prev, campaign: prev.campaign.filter(f => f !== filter) }))}
                            className="ml-2 h-auto p-0 hover:bg-transparent"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>

                    {/* Clear All Button */}
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleClearAllFilters();
                        setColumnFilterOpen(false);
                      }}
                      className="w-full mt-4"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Clear All Filters Button - Only show when filters are active */}
          {hasActiveFilters && (
            <Button
              variant="destructive"
              size="lg"
              onClick={handleClearAllFilters}
              className="shadow-lg hover:shadow-red-500/50 transition-all duration-300"
            >
              <X className="w-5 h-5 mr-2" />
              Clear All Filters
            </Button>
          )}
        </div>

        {/* Comparison Banner */}
        {compareStats && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-purple-300 font-semibold">Comparison Mode Active</span>
              </div>
              <div className="text-sm text-purple-300">
                Current: <span className="font-bold">{stats.total}</span> leads vs 
                Previous: <span className="font-bold">{compareStats.total}</span> leads
                <span className={`ml-2 font-bold ${
                  stats.total > compareStats.total ? 'text-green-400' : 'text-red-400'
                }`}>
                  ({stats.total > compareStats.total ? '+' : ''}{calculateChange(stats.total, compareStats.total).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Leads */}
          <div className="group relative bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-cyan-500/5 border border-cyan-500/40 rounded-2xl p-6 hover:border-cyan-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm uppercase tracking-wider font-bold">Total Leads</p>
                  <p className="text-4xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mt-2">{stats.total.toLocaleString()}</p>
                  {compareStats && (
                    <p className={`text-sm mt-1 font-semibold ${
                      stats.total > compareStats.total ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stats.total > compareStats.total ? '↑' : '↓'} {Math.abs(calculateChange(stats.total, compareStats.total)).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="bg-cyan-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Struxure Leads */}
          <div className="group relative bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-blue-500/5 border border-blue-500/40 rounded-2xl p-6 hover:border-blue-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm uppercase tracking-wider font-bold">Struxure Leads</p>
                  <p className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text mt-2">{stats.struxure.toLocaleString()}</p>
                  <p className="text-gray-400 text-xs mt-1 font-medium">
                    {stats.total > 0 ? ((stats.struxure / stats.total) * 100).toFixed(1) : 0}%
                    {compareStats && (
                      <span className={`ml-2 font-semibold ${
                        stats.struxure > compareStats.struxure ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stats.struxure > compareStats.struxure ? '↑' : '↓'} {Math.abs(calculateChange(stats.struxure, compareStats.struxure)).toFixed(1)}%
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Deepwater Leads */}
          <div className="group relative bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/5 border border-purple-500/40 rounded-2xl p-6 hover:border-purple-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm uppercase tracking-wider font-bold">Deepwater Leads</p>
                  <p className="text-4xl font-black text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mt-2">{stats.deepwater.toLocaleString()}</p>
                  <p className="text-gray-400 text-xs mt-1 font-medium">
                    {stats.total > 0 ? ((stats.deepwater / stats.total) * 100).toFixed(1) : 0}%
                    {compareStats && (
                      <span className={`ml-2 font-semibold ${
                        stats.deepwater > compareStats.deepwater ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stats.deepwater > compareStats.deepwater ? '↑' : '↓'} {Math.abs(calculateChange(stats.deepwater, compareStats.deepwater)).toFixed(1)}%
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-purple-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Project Type */}
          <div className="group relative bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-500/5 border border-green-500/40 rounded-2xl p-6 hover:border-green-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <p className="text-gray-300 text-sm uppercase tracking-wider mb-4 font-bold">Project Type</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-200 font-medium">Residential</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-green-400">{stats.residential.toLocaleString()}</span>
                    {compareStats && (
                      <span className={`ml-2 text-xs font-semibold ${
                        stats.residential > compareStats.residential ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stats.residential > compareStats.residential ? '↑' : '↓'}{Math.abs(calculateChange(stats.residential, compareStats.residential)).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-200 font-medium">Commercial</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-orange-400">{stats.commercial.toLocaleString()}</span>
                    {compareStats && (
                      <span className={`ml-2 text-xs font-semibold ${
                        stats.commercial > compareStats.commercial ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stats.commercial > compareStats.commercial ? '↑' : '↓'}{Math.abs(calculateChange(stats.commercial, compareStats.commercial)).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* UTM Source Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Organic/Direct */}
          <div className="group relative bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/40 rounded-2xl p-6 hover:border-cyan-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm uppercase tracking-wider font-bold">Organic/Direct</p>
                  <p className="text-4xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text mt-2">{stats.organic.toLocaleString()}</p>
                  {compareStats && (
                    <p className={`text-sm mt-1 font-semibold ${
                      stats.organic > compareStats.organic ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stats.organic > compareStats.organic ? '↑' : '↓'} {Math.abs(calculateChange(stats.organic, compareStats.organic)).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="bg-cyan-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Facebook */}
          <div className="group relative bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/40 rounded-2xl p-6 hover:border-pink-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm uppercase tracking-wider font-bold">Facebook</p>
                  <p className="text-4xl font-black text-transparent bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text mt-2">{stats.facebook.toLocaleString()}</p>
                  {compareStats && (
                    <p className={`text-sm mt-1 font-semibold ${
                      stats.facebook > compareStats.facebook ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stats.facebook > compareStats.facebook ? '↑' : '↓'} {Math.abs(calculateChange(stats.facebook, compareStats.facebook)).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="bg-pink-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Google */}
          <div className="group relative bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/40 rounded-2xl p-6 hover:border-yellow-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm uppercase tracking-wider font-bold">Google</p>
                  <p className="text-4xl font-black text-transparent bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text mt-2">{stats.google.toLocaleString()}</p>
                  {compareStats && (
                    <p className={`text-sm mt-1 font-semibold ${
                      stats.google > compareStats.google ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stats.google > compareStats.google ? '↑' : '↓'} {Math.abs(calculateChange(stats.google, compareStats.google)).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="bg-yellow-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* YouTube */}
          <div className="group relative bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/40 rounded-2xl p-6 hover:border-red-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-red-500/20 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm uppercase tracking-wider font-bold">YouTube</p>
                  <p className="text-4xl font-black text-transparent bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text mt-2">{stats.youtube.toLocaleString()}</p>
                  {compareStats && (
                    <p className={`text-sm mt-1 font-semibold ${
                      stats.youtube > compareStats.youtube ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stats.youtube > compareStats.youtube ? '↑' : '↓'} {Math.abs(calculateChange(stats.youtube, compareStats.youtube)).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="bg-red-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {paginatedData.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
            {/* Table Header with Refresh Button */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Leads Table
              </h3>
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
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-800 to-slate-700 sticky top-0 z-10 shadow-lg">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">City, State</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Route To</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Project Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
                  {paginatedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-slate-800/30 transition-all duration-200">
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">{row.Timestamp}</td>
                      <td className="px-4 py-3 text-sm text-white font-bold">{row.First_Name} {row.Last_Name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">{row.Email}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">{row.Phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">{row.City}, {row.State}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">{row.Route_To}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">{row.Project_Type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-6 py-5 flex items-center justify-between border-t border-slate-700/50 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300 font-medium">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white text-sm font-medium focus:border-cyan-500 focus:outline-none cursor-pointer hover:bg-slate-800/50 transition-colors"
                >
                  <option value={25}>25</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                </select>
              </div>
              <div className="text-sm text-gray-200 font-medium bg-slate-900/30 px-4 py-2 rounded-xl">
                Page <span className="text-cyan-400 font-bold">{currentPage}</span> of <span className="text-gray-300">{totalPages}</span> 
                <span className="text-gray-400 ml-2">({filteredData.length.toLocaleString()} total)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-lg disabled:shadow-none"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:shadow-none"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Data */}
        {paginatedData.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No data found</div>
            <div className="text-gray-500 text-sm">
              {dateFilter ? 'Try adjusting your date filter or clear filters to see all data.' : 'No leads data available.'}
            </div>
            {dateFilter && (
              <button
                onClick={handleClearDateFilter}
                className="mt-4 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-colors"
              >
                Clear Date Filter
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}