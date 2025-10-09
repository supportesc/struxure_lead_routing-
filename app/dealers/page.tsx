'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import DateFilter, { DateRange } from '@/components/DateFilter';
import { SheetData } from '../api/sheet-data/route';
import { 
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

export default function DealersPage() {
  const [data, setData] = useState<SheetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRange | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If force refresh, call POST to refresh cache
      if (forceRefresh) {
        await fetch('/api/sheet-data', { method: 'POST' });
      }
      
      const response = await fetch('/api/sheet-data');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter data by date range
  const filterDataByDateRange = (data: SheetData[], range: DateRange | null) => {
    if (!range) return data;
    
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    endDate.setHours(23, 59, 59, 999);
    
    return data.filter(item => {
      const itemDate = new Date(item.Timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const filteredData = useMemo(() => 
    filterDataByDateRange(data, dateFilter), 
    [data, dateFilter]
  );

  const handleDateFilterChange = (range: DateRange | null) => {
    setDateFilter(range);
  };

  // Process dealer data
  const struxureDealers = useMemo(() => {
    const dealerCounts: Record<string, number> = {};
    
    filteredData.forEach(item => {
      const dealer = item['Struxure Dealer'];
      if (dealer && dealer.trim() !== '') {
        dealerCounts[dealer] = (dealerCounts[dealer] || 0) + 1;
      }
    });
    
    return Object.entries(dealerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const deepwaterDealers = useMemo(() => {
    const dealerCounts: Record<string, number> = {};
    
    filteredData.forEach(item => {
      const dealer = item['Deepwater Dealer'];
      if (dealer && dealer.trim() !== '') {
        dealerCounts[dealer] = (dealerCounts[dealer] || 0) + 1;
      }
    });
    
    return Object.entries(dealerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const totalStruxure = struxureDealers.reduce((sum, dealer) => sum + dealer.count, 0);
  const totalDeepwater = deepwaterDealers.reduce((sum, dealer) => sum + dealer.count, 0);

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#14b8a6'];

  if (isLoading) {
    return (
      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl sm:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Thank You
              </span>
              {' '}
              <span className="text-white">Message Report</span>
            </h1>
          </div>
          <Navigation />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Navigation />
          <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-6 py-4 rounded-xl">
            Error: {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Thank You
            </span>
            {' '}
            <span className="text-white">Message Report</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Dealer assignment breakdown and analytics
          </p>
        </div>

        <Navigation />

        {/* Date Filter */}
        <div className="flex justify-center mb-8">
          <DateFilter 
            onFilterChange={handleDateFilterChange}
            totalLeads={filteredData.length}
          />
        </div>

        {/* Active Date Range Display */}
        {dateFilter && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-6 py-3">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-cyan-300 font-semibold">
                Viewing: {new Date(dateFilter.start).toLocaleDateString()} → {new Date(dateFilter.end).toLocaleDateString()}
              </span>
              <button
                onClick={() => handleDateFilterChange(null)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors ml-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Struxure Total */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-wider">Struxure Dealer Leads</p>
                <p className="text-5xl font-bold text-blue-400 mt-2">{totalStruxure.toLocaleString()}</p>
                <p className="text-gray-500 text-sm mt-1">{struxureDealers.length} active dealers</p>
              </div>
              <div className="bg-blue-500/20 p-4 rounded-xl">
                <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Deepwater Total */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-wider">Deepwater Dealer Leads</p>
                <p className="text-5xl font-bold text-purple-400 mt-2">{totalDeepwater.toLocaleString()}</p>
                <p className="text-gray-500 text-sm mt-1">{deepwaterDealers.length} active dealers</p>
              </div>
              <div className="bg-purple-500/20 p-4 rounded-xl">
                <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Struxure Dealers Chart */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded"></div>
              Struxure Dealer Distribution
            </h3>
            {struxureDealers.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={struxureDealers.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-400">
                No Struxure dealer assignments found
              </div>
            )}
          </div>

          {/* Deepwater Dealers Chart */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-purple-600 rounded"></div>
              Deepwater Dealer Distribution
            </h3>
            {deepwaterDealers.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={deepwaterDealers.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-400">
                No Deepwater dealer assignments found
              </div>
            )}
          </div>

          {/* Struxure Pie Chart */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded"></div>
              Top Struxure Dealers (Pie)
            </h3>
            {struxureDealers.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={struxureDealers.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {struxureDealers.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>

          {/* Deepwater Pie Chart */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-500 rounded"></div>
              Top Deepwater Dealers (Pie)
            </h3>
            {deepwaterDealers.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={deepwaterDealers.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {deepwaterDealers.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Detailed Dealer Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Struxure Dealer Table */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Struxure Dealers ({struxureDealers.length})</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="min-w-full">
                <thead className="bg-slate-900/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Dealer Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-400 uppercase">Leads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {struxureDealers.map((dealer, index) => (
                    <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link 
                          href={`/dealers/${encodeURIComponent(dealer.name)}`}
                          className="text-white hover:text-cyan-400 transition-colors hover:underline font-medium"
                        >
                          {dealer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-400 font-bold text-right">{dealer.count.toLocaleString()}</td>
                    </tr>
                  ))}
                  {struxureDealers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No dealer assignments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deepwater Dealer Table */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Deepwater Dealers ({deepwaterDealers.length})</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="min-w-full">
                <thead className="bg-slate-900/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Dealer Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-400 uppercase">Leads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {deepwaterDealers.map((dealer, index) => (
                    <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link 
                          href={`/dealers/${encodeURIComponent(dealer.name)}`}
                          className="text-white hover:text-purple-400 transition-colors hover:underline font-medium"
                        >
                          {dealer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-purple-400 font-bold text-right">{dealer.count.toLocaleString()}</td>
                    </tr>
                  ))}
                  {deepwaterDealers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No dealer assignments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => fetchData(true)}
            disabled={isLoading}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>
    </main>
  );
}

