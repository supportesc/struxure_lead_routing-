'use client';

import { useState } from 'react';

export type DateRange = {
  start: string;
  end: string;
};

interface DateFilterProps {
  onFilterChange: (range: DateRange | null, compareRange?: DateRange | null) => void;
  totalLeads: number;
}

export default function DateFilter({ onFilterChange, totalLeads }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });
  const [compareDateRange, setCompareDateRange] = useState<DateRange>({ start: '', end: '' });
  const [isActive, setIsActive] = useState(false);

  const handleApply = () => {
    if (dateRange.start && dateRange.end) {
      setIsActive(true);
      onFilterChange(
        dateRange,
        showCompare && compareDateRange.start && compareDateRange.end ? compareDateRange : null
      );
    }
  };

  const handleClear = () => {
    setDateRange({ start: '', end: '' });
    setCompareDateRange({ start: '', end: '' });
    setShowCompare(false);
    setIsActive(false);
    onFilterChange(null, null);
  };

  const presetRanges = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
  ];

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const range = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
    
    setDateRange(range);
    setIsActive(true);
    onFilterChange(range, null);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
          isActive
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
            : 'bg-slate-800/50 text-gray-300 border border-slate-700/50 hover:border-cyan-500/50'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {isActive ? 'Date Filter Active' : 'Filter by Date'}
        {isActive && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {totalLeads} leads
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 w-[400px] z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Date Range Filter</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Quick Select:</p>
            <div className="flex gap-2">
              {presetRanges.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.days)}
                  className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Date Range */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Compare Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowCompare(!showCompare)}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {showCompare ? 'Hide Comparison' : 'Compare to Another Period'}
            </button>
          </div>

          {/* Compare Date Range */}
          {showCompare && (
            <div className="space-y-3 mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Compare Period</p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Compare Start Date</label>
                <input
                  type="date"
                  value={compareDateRange.start}
                  onChange={(e) => setCompareDateRange({ ...compareDateRange, start: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Compare End Date</label>
                <input
                  type="date"
                  value={compareDateRange.end}
                  onChange={(e) => setCompareDateRange({ ...compareDateRange, end: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={!dateRange.start || !dateRange.end}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Filter
            </button>
            {isActive && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg font-semibold transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

