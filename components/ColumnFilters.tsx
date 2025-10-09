'use client';

import { useState, useEffect } from 'react';
import { SheetData } from '@/app/api/sheet-data/route';

export type ColumnFilters = {
  routeTo: string[];
  projectType: string[];
  utmSource: string[];
  campaign: string[];
};

interface ColumnFiltersProps {
  data: SheetData[];
  onFilterChange: (filters: ColumnFilters) => void;
  activeCount: number;
}

export default function ColumnFilters({ data, onFilterChange, activeCount }: ColumnFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<ColumnFilters>({
    routeTo: [],
    projectType: [],
    utmSource: [],
    campaign: [],
  });

  // Get unique values for each filter
  const uniqueRoutes = Array.from(new Set(data.map(item => item['Route To']).filter(Boolean))).sort();
  const uniqueProjectTypes = Array.from(new Set(data.map(item => item['Project Type']).filter(Boolean))).sort();
  const uniqueUTMSources = Array.from(new Set(data.map(item => item['UTM Source']).filter(Boolean))).sort();
  const uniqueCampaigns = Array.from(new Set(data.map(item => item.Campaign).filter(c => c && c.trim() !== ''))).sort();

  const handleToggle = (category: keyof ColumnFilters, value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      return { ...prev, [category]: updated };
    });
  };

  const handleApply = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const emptyFilters = {
      routeTo: [],
      projectType: [],
      utmSource: [],
      campaign: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const totalActiveFilters = 
    filters.routeTo.length + 
    filters.projectType.length + 
    filters.utmSource.length + 
    filters.campaign.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
          totalActiveFilters > 0
            ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
            : 'bg-slate-800/50 text-gray-300 border border-slate-700/50 hover:border-purple-500/50'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Column Filters
        {totalActiveFilters > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {totalActiveFilters} active
          </span>
        )}
        {activeCount > 0 && (
          <span className="text-xs opacity-80">
            ({activeCount} results)
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 w-[500px] z-50 max-h-[600px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Filter Columns</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Route To Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Route To</h4>
            <div className="space-y-2">
              {uniqueRoutes.map(route => (
                <label key={route} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.routeTo.includes(route)}
                    onChange={() => handleToggle('routeTo', route)}
                    className="w-4 h-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {route} ({data.filter(item => item['Route To'] === route).length})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Project Type Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Project Type</h4>
            <div className="space-y-2">
              {uniqueProjectTypes.map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.projectType.includes(type)}
                    onChange={() => handleToggle('projectType', type)}
                    className="w-4 h-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {type} ({data.filter(item => item['Project Type'] === type).length})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* UTM Source Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">UTM Source</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {uniqueUTMSources.map(source => (
                <label key={source} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.utmSource.includes(source)}
                    onChange={() => handleToggle('utmSource', source)}
                    className="w-4 h-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {source} ({data.filter(item => item['UTM Source'] === source).length})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Campaign Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Campaign</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {uniqueCampaigns.slice(0, 20).map(campaign => (
                <label key={campaign} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.campaign.includes(campaign)}
                    onChange={() => handleToggle('campaign', campaign)}
                    className="w-4 h-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                    {campaign} ({data.filter(item => item.Campaign === campaign).length})
                  </span>
                </label>
              ))}
              {uniqueCampaigns.length > 20 && (
                <p className="text-xs text-gray-500 italic">
                  Showing top 20 of {uniqueCampaigns.length} campaigns
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-700">
            <button
              onClick={handleApply}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
            >
              Apply Filters
            </button>
            {totalActiveFilters > 0 && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg font-semibold transition-all"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

