import React from 'react';
import { Copy, Check, Download, Database, ShieldCheck, Terminal, Layers, Smartphone } from 'lucide-react';

interface HeaderProps {
  activeTab: 'sql' | 'erd' | 'simulator' | 'rls' | 'guide' | 'customer-card';
  setActiveTab: (tab: 'sql' | 'erd' | 'simulator' | 'rls' | 'guide' | 'customer-card') => void;
  onCopyFullSql: () => void;
  copied: boolean;
  onDownloadSql: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onCopyFullSql,
  copied,
  onDownloadSql
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <a href="#" className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
              Supabase Loyalty Schema Studio
            </a>
          </div>

          {/* Zone 2: 4-5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('customer-card')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'customer-card'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Customer Card (Next.js)
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'sql'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              SQL Script
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Trigger Simulator
            </button>
            <button
              onClick={() => setActiveTab('erd')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'erd'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Schema Architecture
            </button>
            <button
              onClick={() => setActiveTab('rls')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'rls'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              RLS Matrix
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Deploy Guide
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onCopyFullSql}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              title="Copy complete production SQL script to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied SQL' : 'Copy SQL'}</span>
            </button>
            <button
              onClick={onDownloadSql}
              className="hidden sm:flex px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              title="Download schema.sql file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .sql</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
