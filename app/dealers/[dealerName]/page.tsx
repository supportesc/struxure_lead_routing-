'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import DateFilter, { DateRange } from '@/components/DateFilter';
import Pagination from '@/components/Pagination';
import { SheetData } from '@/app/api/sheet-data/route';

export default function DealerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealerName = decodeURIComponent(params.dealerName as string);
  
  const [data, setData] = useState<SheetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRange | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
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

  // Filter data by dealer and date
  const dealerLeads = useMemo(() => {
    return data.filter(item => 
      item['Struxure Dealer'] === dealerName || item['Deepwater Dealer'] === dealerName
    );
  }, [data, dealerName]);

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
    filterDataByDateRange(dealerLeads, dateFilter), 
    [dealerLeads, dateFilter]
  );

  const handleDateFilterChange = (range: DateRange | null) => {
    setDateFilter(range);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  // Calculate stats
  const stats = useMemo(() => {
    const residential = filteredData.filter(item => item['Project Type'] === 'Residential').length;
    const commercial = filteredData.filter(item => item['Project Type'] === 'Commercial').length;
    const organic = filteredData.filter(item => 
      item['UTM Source']?.toLowerCase().includes('organic') || 
      item['UTM Source']?.toLowerCase().includes('direct')
    ).length;
    const facebook = filteredData.filter(item => 
      item['UTM Source']?.toLowerCase().includes('facebook') || 
      item['UTM Source']?.toLowerCase().includes('fb')
    ).length;
    const google = filteredData.filter(item => 
      item['UTM Source']?.toLowerCase().includes('google')
    ).length;

    return { residential, commercial, organic, facebook, google };
  }, [filteredData]);

  const dealerType = dealerLeads.length > 0 
    ? (dealerLeads[0]['Struxure Dealer'] === dealerName ? 'Struxure' : 'Deepwater')
    : 'Unknown';

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

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-gray-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dealers
          </button>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className={`${dealerType === 'Struxure' ? 'text-blue-400' : 'text-purple-400'}`}>
              {dealerName}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            {dealerType} Dealer • {filteredData.length} total leads
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

        {/* Active Date Range */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Leads</p>
            <p className="text-3xl font-bold text-white">{filteredData.length.toLocaleString()}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Residential</p>
            <p className="text-3xl font-bold text-green-400">{stats.residential.toLocaleString()}</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Commercial</p>
            <p className="text-3xl font-bold text-orange-400">{stats.commercial.toLocaleString()}</p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Organic</p>
            <p className="text-3xl font-bold text-cyan-400">{stats.organic.toLocaleString()}</p>
          </div>
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Facebook</p>
            <p className="text-3xl font-bold text-pink-400">{stats.facebook.toLocaleString()}</p>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden mb-8">
          <div className={`px-6 py-4 ${dealerType === 'Struxure' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-purple-600 to-purple-700'}`}>
            <h2 className="text-xl font-bold text-white">All Leads for {dealerName}</h2>
            <p className="text-gray-200 text-sm mt-1">Showing {paginatedData.length} of {filteredData.length} leads</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Phone</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">City</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">State</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Source</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase">Campaign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {paginatedData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      {new Date(row.Timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row['Project Type'] === 'Residential' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-orange-500/20 text-orange-300'
                      }`}>
                        {row['Project Type']}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-white">
                      {row['First Name']} {row['Last Name']}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-300">
                      <a 
                        href={`mailto:${row.Email}`}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors hover:underline"
                      >
                        {row.Email}
                      </a>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      <a 
                        href={`tel:${row.Phone}`}
                        className="text-blue-400 hover:text-blue-300 transition-colors hover:underline"
                      >
                        {row.Phone}
                      </a>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      {row['City ']?.trim() || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      {row.State}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      <span className={`px-2 py-1 rounded text-xs ${
                        row['UTM Source']?.toLowerCase().includes('facebook') || row['UTM Source']?.toLowerCase().includes('fb')
                          ? 'bg-pink-500/10 text-pink-300'
                          : row['UTM Source']?.toLowerCase().includes('google')
                          ? 'bg-yellow-500/10 text-yellow-300'
                          : 'bg-cyan-500/10 text-cyan-300'
                      }`}>
                        {row['UTM Source'] || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">
                      <span className="truncate max-w-[150px] block">
                        {row.Campaign || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      No leads found for this dealer
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!isLoading && filteredData.length > 0 && (
          <div className="space-y-4">
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
      </div>
    </main>
  );
}

