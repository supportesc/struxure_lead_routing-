'use client';

import { useState, useEffect } from 'react';
import { Table, MessageSquare, BarChart3 } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getPageTitle = () => {
    if (pathname === '/thank-you') return 'Dealer Report';
    if (pathname === '/lead-source-comparisons') return 'Source Comparisons';
    return 'Lead Management';
  };

  return (
    <header className={`border-b border-slate-700/50 backdrop-blur-xl shadow-2xl sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-slate-900/80 py-2' 
        : 'bg-slate-900/60 py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src={resolvedTheme === 'light' ? "/logo-black.png" : "/logo-white.png"}
              alt="STRUXURE Logo"
              width={isScrolled ? 80 : 120}
              height={isScrolled ? 80 : 120}
              className="transition-all duration-300"
              priority
            />
            {!isScrolled && (
              <div>
                <p className="text-sm text-gray-400 font-medium">
                  {getPageTitle()}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Lead Table Link */}
            <a
              href="/"
              className={`flex items-center gap-2 rounded-xl font-medium transition-all duration-300 ${
                pathname === '/'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
              } ${
                isScrolled ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
              }`}
            >
              <Table className={`transition-all duration-300 ${
                isScrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'
              }`} />
              {!isScrolled && 'Leads'}
            </a>

            {/* Dealer Report Link */}
            <a
              href="/thank-you"
              className={`flex items-center gap-2 rounded-xl font-medium transition-all duration-300 ${
                pathname === '/thank-you'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
              } ${
                isScrolled ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
              }`}
            >
              <MessageSquare className={`transition-all duration-300 ${
                isScrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'
              }`} />
              {!isScrolled && 'Dealers'}
            </a>

            {/* Comparisons Link */}
            <a
              href="/lead-source-comparisons"
              className={`flex items-center gap-2 rounded-xl font-medium transition-all duration-300 ${
                pathname === '/lead-source-comparisons'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
              } ${
                isScrolled ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
              }`}
            >
              <BarChart3 className={`transition-all duration-300 ${
                isScrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'
              }`} />
              {!isScrolled && 'Compare'}
            </a>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

