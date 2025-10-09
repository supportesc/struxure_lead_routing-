'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/bigquery-data?page=${currentPage}&limit=${itemsPerPage}&nocache=true`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Lead Management
            </span>
          </h1>
          <p className="text-gray-400">
            Showing {data.length} of {totalCount.toLocaleString()} total leads
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg">
            <strong className="font-medium">Error:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading leads...</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && data.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">City, State</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Route To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Project Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-300">{row.Timestamp}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{row.First_Name} {row.Last_Name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{row.Email}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{row.Phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{row.City}, {row.State}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{row.Route_To}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{row.Project_Type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-700/30 px-6 py-4 flex items-center justify-between border-t border-slate-700">
              <div className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Data */}
        {!isLoading && data.length === 0 && !error && (
          <div className="text-center py-12 text-gray-400">
            No data available
          </div>
        )}
      </div>
    </main>
  );
}

