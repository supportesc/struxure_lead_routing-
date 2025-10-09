'use client';

import { useState, useEffect, useMemo } from 'react';
import DataTable from '@/components/DataTable';
import Navigation from '@/components/Navigation';
import DateFilter, { DateRange } from '@/components/DateFilter';
import ColumnFilters, { ColumnFilters as ColumnFiltersType } from '@/components/ColumnFilters';
import Pagination from '@/components/Pagination';
import { SheetData } from './api/sheet-data/route';

export default function Home() {
  const [data, setData] = useState<SheetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRange | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersType>({
    routeTo: [],
    projectType: [],
    utmSource: [],
    campaign: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If force refresh, call POST to refresh cache
      if (forceRefresh) {
        console.log('🔄 Force refreshing cache...');
        await fetch('/api/sheet-data', { method: 'POST' });
      }
      
      const response = await fetch('/api/sheet-data');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data by date range
  const filterDataByDateRange = (data: SheetData[], range: DateRange | null) => {
    if (!range) return data;
    
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    endDate.setHours(23, 59, 59, 999); // Include the entire end date
    
    return data.filter(item => {
      const itemDate = new Date(item.Timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  // Apply date filter first
  const dateFilteredData = useMemo(() => 
    filterDataByDateRange(data, dateFilter), 
    [data, dateFilter]
  );

  // Then apply column filters
  const filteredData = useMemo(() => {
    let result = dateFilteredData;

    // Filter by Route To
    if (columnFilters.routeTo.length > 0) {
      result = result.filter(item => columnFilters.routeTo.includes(item['Route To']));
    }

    // Filter by Project Type
    if (columnFilters.projectType.length > 0) {
      result = result.filter(item => columnFilters.projectType.includes(item['Project Type']));
    }

    // Filter by UTM Source
    if (columnFilters.utmSource.length > 0) {
      result = result.filter(item => columnFilters.utmSource.includes(item['UTM Source']));
    }

    // Filter by Campaign
    if (columnFilters.campaign.length > 0) {
      result = result.filter(item => columnFilters.campaign.includes(item.Campaign));
    }

    return result;
  }, [dateFilteredData, columnFilters]);

  const handleDateFilterChange = (range: DateRange | null) => {
    setDateFilter(range);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleColumnFiltersChange = (filters: ColumnFiltersType) => {
    setColumnFilters(filters);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  // Paginate the filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Lead
            </span>
            {' '}
            <span className="text-white">Management Dashboard</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Live leads from your Google Sheet • Showing {paginatedData.length} of {filteredData.length} leads
            {dateFilter && <span className="text-cyan-400"> (filtered)</span>}
            {!dateFilter && filteredData.length < data.length && <span className="text-cyan-400"> (page {currentPage})</span>}
          </p>
        </div>

        <Navigation />

        {/* Control Bar with Date Filter and Actions */}
        <div className="bg-slate-800/30 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left: Date Filter and Info */}
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex flex-wrap items-center gap-4">
                <DateFilter 
                  onFilterChange={handleDateFilterChange}
                  totalLeads={filteredData.length}
                />
                <ColumnFilters 
                  data={dateFilteredData}
                  onFilterChange={handleColumnFiltersChange}
                  activeCount={filteredData.length}
                />
            <button
              onClick={() => fetchData(true)}
              disabled={isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
              </div>

              {/* Active Date Range Display */}
              {dateFilter && (
                <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-4 py-2 w-fit">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-cyan-300 font-semibold">
                    Filtered: {new Date(dateFilter.start).toLocaleDateString()} → {new Date(dateFilter.end).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDateFilterChange(null)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {lastUpdated && !isLoading && !dateFilter && (
                <p className="text-xs text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Right: Quick Stats Grid */}
            {!isLoading && (
              <div className="grid grid-cols-4 gap-3 lg:min-w-[500px]">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Struxure</div>
                  <div className="text-lg font-bold text-blue-400">
                    {dateFilteredData.filter(item => item['Route To'] === 'Struxure').length.toLocaleString()}
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Deep Water</div>
                  <div className="text-lg font-bold text-purple-400">
                    {dateFilteredData.filter(item => item['Route To'] === 'Deep Water').length.toLocaleString()}
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Residential</div>
                  <div className="text-lg font-bold text-green-400">
                    {dateFilteredData.filter(item => item['Project Type'] === 'Residential').length.toLocaleString()}
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Commercial</div>
                  <div className="text-lg font-bold text-orange-400">
                    {dateFilteredData.filter(item => item['Project Type'] === 'Commercial').length.toLocaleString()}
                  </div>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Organic</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {dateFilteredData.filter(item => item['UTM Source']?.toLowerCase().includes('organic') || item['UTM Source']?.toLowerCase().includes('direct')).length.toLocaleString()}
                  </div>
                </div>

                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Facebook</div>
                  <div className="text-lg font-bold text-pink-400">
                    {dateFilteredData.filter(item => item['UTM Source']?.toLowerCase().includes('facebook') || item['UTM Source']?.toLowerCase().includes('fb')).length.toLocaleString()}
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Google</div>
                  <div className="text-lg font-bold text-yellow-400">
                    {dateFilteredData.filter(item => item['UTM Source']?.toLowerCase().includes('google')).length.toLocaleString()}
                  </div>
                </div>

                <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Cabana X</div>
                  <div className="text-lg font-bold text-teal-400">
                    {dateFilteredData.filter(item => item['Route To']?.toLowerCase().includes('cabana')).length.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-6xl mx-auto mb-8">
            <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <strong className="font-medium">Error:</strong>
              </div>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Data Table */}
        <DataTable data={paginatedData} isLoading={isLoading} />

        {/* Pagination */}
        {!isLoading && filteredData.length > 0 && (
          <div className="space-y-4">
            {/* Items per page selector */}
            <div className="flex justify-center items-center gap-3">
              <label className="text-sm text-gray-400">Show per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalItems={filteredData.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-400">
          <p className="flex items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Data is fetched live from Google Sheets via Google Apps Script
          </p>
        </div>
      </div>
    </main>
  );
}


