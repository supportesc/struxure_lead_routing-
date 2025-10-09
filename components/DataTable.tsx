'use client';

import { SheetData } from '@/app/api/sheet-data/route';

interface DataTableProps {
  data: SheetData[];
  isLoading?: boolean;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function formatPhone(phone: number) {
  const phoneStr = phone.toString();
  if (phoneStr.length === 11) {
    return `${phoneStr[0]} (${phoneStr.slice(1, 4)}) ${phoneStr.slice(4, 7)}-${phoneStr.slice(7)}`;
  }
  return phoneStr;
}

export default function DataTable({ data, isLoading = false }: DataTableProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl shadow-blue-500/10 border border-slate-700/50 overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl shadow-blue-500/10 border border-slate-700/50 overflow-hidden">
          <div className="p-8 text-center">
            <p className="text-gray-400">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl shadow-blue-500/20 border border-slate-700/50 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-6 py-5">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Lead Directory
          </h2>
          <p className="text-cyan-100 text-sm mt-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
            {data.length} {data.length === 1 ? 'lead' : 'leads'} found
          </p>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-900/50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Route
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Type
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Name
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Email
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Phone
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Address
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  City
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  State
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Zip
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  UTM Source
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Campaign
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Medium
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Unique ID
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  Dealer
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {data.map((row, index) => {
                const dealer = row['Deepwater Dealer'] || row['Struxure Dealer'] || '-';
                return (
                  <tr 
                    key={index} 
                    className="hover:bg-slate-700/30 transition-all duration-200 group"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      {formatDate(row.Timestamp)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-200">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        row['Route To'] === 'Struxure' 
                          ? 'bg-blue-500/20 text-blue-300' 
                          : row['Route To']?.includes('Cabana')
                          ? 'bg-teal-500/20 text-teal-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {row['Route To']}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
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
                        title={row.Email}
                      >
                        <span className="truncate max-w-[150px] block">{row.Email}</span>
                      </a>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      <a 
                        href={`tel:${row.Phone}`}
                        className="text-blue-400 hover:text-blue-300 transition-colors hover:underline"
                      >
                        {formatPhone(row.Phone)}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-300">
                      <span className="truncate max-w-[200px] block" title={row.Street}>
                        {row.Street || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      {row['City ']?.trim() || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      {row.State || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      {row.Zip || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300">
                      <span className={`px-2 py-1 rounded text-xs ${
                        row['UTM Source']?.toLowerCase().includes('facebook') || row['UTM Source']?.toLowerCase().includes('fb')
                          ? 'bg-pink-500/10 text-pink-300'
                          : row['UTM Source']?.toLowerCase().includes('google')
                          ? 'bg-yellow-500/10 text-yellow-300'
                          : row['UTM Source']?.toLowerCase().includes('organic') || row['UTM Source']?.toLowerCase().includes('direct')
                          ? 'bg-cyan-500/10 text-cyan-300'
                          : 'bg-slate-700/30 text-gray-400'
                      }`}>
                        {row['UTM Source'] || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">
                      <span className="truncate max-w-[120px] block" title={row.Campaign}>
                        {row.Campaign || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-400">
                      {row.Medium || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-400">
                      {row['Unique ID'] || '-'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-300">
                      <span className="truncate max-w-[120px] block" title={dealer}>
                        {dealer}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


