'use client';

import { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import DateFilter, { DateRange } from '@/components/DateFilter';
import { SheetData } from '../api/sheet-data/route';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';

export default function ChartsPage() {
  const [data, setData] = useState<SheetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRange | null>(null);
  const [compareDateFilter, setCompareDateFilter] = useState<DateRange | null>(null);

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
    endDate.setHours(23, 59, 59, 999); // Include the entire end date
    
    return data.filter(item => {
      const itemDate = new Date(item.Timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const filteredData = useMemo(() => 
    filterDataByDateRange(data, dateFilter), 
    [data, dateFilter]
  );

  const compareData = useMemo(() => 
    compareDateFilter ? filterDataByDateRange(data, compareDateFilter) : null,
    [data, compareDateFilter]
  );

  const handleDateFilterChange = (range: DateRange | null, compareRange?: DateRange | null) => {
    setDateFilter(range);
    setCompareDateFilter(compareRange || null);
  };

  // Calculate percentage change for comparison
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Process data for charts
  const routeData = filteredData.reduce((acc, item) => {
    const route = item['Route To'];
    acc[route] = (acc[route] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const projectTypeData = filteredData.reduce((acc, item) => {
    const type = item['Project Type'];
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stateData = filteredData.reduce((acc, item) => {
    const state = item.State;
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadsOverTime = filteredData.reduce((acc, item) => {
    const date = new Date(item.Timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Comparison data if enabled
  const compareRouteData = compareData?.reduce((acc, item) => {
    const route = item['Route To'];
    acc[route] = (acc[route] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Convert to chart data format
  const routeChartData = Object.entries(routeData).map(([name, value]) => ({ name, value }));
  const projectTypeChartData = Object.entries(projectTypeData).map(([name, value]) => ({ name, value }));
  const stateChartData = Object.entries(stateData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
  const timelineData = Object.entries(leadsOverTime).map(([name, value]) => ({ name, value }));

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  if (isLoading) {
    return (
      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
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
              Lead
            </span>
            {' '}
            <span className="text-white">Analytics</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Visual insights from {data.length} leads
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

        {/* Comparison Banner */}
        {compareData && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-purple-300 font-semibold">Comparison Mode Active</span>
              </div>
              <div className="text-sm text-purple-300">
                Current: <span className="font-bold">{filteredData.length}</span> leads vs 
                Previous: <span className="font-bold">{compareData.length}</span> leads
                <span className={`ml-2 font-bold ${
                  filteredData.length > compareData.length ? 'text-green-400' : 'text-red-400'
                }`}>
                  ({filteredData.length > compareData.length ? '+' : ''}{calculateChange(filteredData.length, compareData.length).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Leads</p>
                <p className="text-3xl font-bold text-white mt-1">{filteredData.length}</p>
                {compareData && (
                  <p className={`text-sm mt-1 font-semibold ${
                    filteredData.length > compareData.length ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {filteredData.length > compareData.length ? '↑' : '↓'} {Math.abs(calculateChange(filteredData.length, compareData.length)).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="bg-cyan-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Struxure</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">{routeData['Struxure'] || 0}</p>
                {compareData && compareRouteData && (
                  <p className={`text-sm mt-1 font-semibold ${
                    (routeData['Struxure'] || 0) > (compareRouteData['Struxure'] || 0) ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(routeData['Struxure'] || 0) > (compareRouteData['Struxure'] || 0) ? '↑' : '↓'} 
                    {Math.abs(calculateChange(routeData['Struxure'] || 0, compareRouteData['Struxure'] || 0)).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Deep Water</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{routeData['Deep Water'] || 0}</p>
                {compareData && compareRouteData && (
                  <p className={`text-sm mt-1 font-semibold ${
                    (routeData['Deep Water'] || 0) > (compareRouteData['Deep Water'] || 0) ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(routeData['Deep Water'] || 0) > (compareRouteData['Deep Water'] || 0) ? '↑' : '↓'} 
                    {Math.abs(calculateChange(routeData['Deep Water'] || 0, compareRouteData['Deep Water'] || 0)).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Residential</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{projectTypeData['Residential'] || 0}</p>
                {compareData && (
                  <p className={`text-sm mt-1 font-semibold ${
                    (projectTypeData['Residential'] || 0) > (compareData.filter(d => d['Project Type'] === 'Residential').length) 
                      ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(projectTypeData['Residential'] || 0) > (compareData.filter(d => d['Project Type'] === 'Residential').length) ? '↑' : '↓'} 
                    {Math.abs(calculateChange(projectTypeData['Residential'] || 0, compareData.filter(d => d['Project Type'] === 'Residential').length)).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Route Distribution */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded"></div>
              Lead Distribution by Route
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={routeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {routeChartData.map((entry, index) => (
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
          </div>

          {/* Project Type Distribution */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-500 rounded"></div>
              Project Type Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectTypeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 States */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-500 rounded"></div>
              Top 10 States
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stateChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={50} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="value" fill="#06b6d4" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Leads Over Time */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-cyan-500 rounded"></div>
              Leads Timeline
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
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

