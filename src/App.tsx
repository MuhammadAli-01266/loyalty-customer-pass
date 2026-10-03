'use client';

import { useState } from 'react';
import LoyaltyStampPass from './components/LoyaltyStampPass';
import { SqlViewer } from './components/SqlViewer';
import { SchemaErd } from './components/SchemaErd';
import { TriggerSimulator } from './components/TriggerSimulator';
import { RlsMatrix } from './components/RlsMatrix';
import { SupabaseGuide } from './components/SupabaseGuide';
import { COMPLETE_SQL_SCRIPT } from './data/schemaSql';
import { 
  Database, 
  X, 
  Terminal, 
  Layers, 
  ShieldCheck, 
  BookOpen, 
  Copy, 
  Check, 
  Download 
} from 'lucide-react';

export default function App() {
  const [isBackendDrawerOpen, setIsBackendDrawerOpen] = useState<boolean>(false);
  const [backendTab, setBackendTab] = useState<'sql' | 'erd' | 'simulator' | 'rls' | 'guide'>('sql');
  const [copiedFull, setCopiedFull] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleCopyFullSql = () => {
    navigator.clipboard.writeText(COMPLETE_SQL_SCRIPT);
    setCopiedFull(true);
    showToast('Complete PostgreSQL setup script copied to clipboard!');
    setTimeout(() => setCopiedFull(false), 2200);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Snippet copied to clipboard!');
  };

  const handleDownloadSql = () => {
    const blob = new Blob([COMPLETE_SQL_SCRIPT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supabase_multi_tenant_loyalty_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded schema.sql');
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-white flex flex-col items-center justify-start font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* App Layout starts directly from the Merchant Branding Header (No studio control bar) */}
      <main className="w-full flex justify-center">
        <LoyaltyStampPass 
          tenantName="Blue Bottle Coffee"
          tenantLocation="Hayes Valley • 315 Linden St, SF"
          customerName="Elena Rostova"
          memberId="88-849204"
          tier="Gold Brew Club"
          totalStamps={7}
          rewardTitle="Free Handcrafted Coffee"
        />
      </main>

      {/* Quiet Technical Footer Link (Keeps database schema inspectable if needed) */}
      <footer className="w-full max-w-[420px] py-4 text-center text-xs text-white/30 hover:text-white/60 transition-colors">
        <button
          onClick={() => setIsBackendDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 cursor-pointer hover:underline"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
          <span>Supabase PostgreSQL Schema & RLS Policies</span>
        </button>
      </footer>

      {/* Slide-over Drawer for Supabase Backend & RLS Policies */}
      {isBackendDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
          onClick={() => setIsBackendDrawerOpen(false)}
        >
          <div 
            className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Supabase Multi-Tenant Engine</h3>
                  <p className="text-xs text-slate-400">PostgreSQL Schema, Anti-Fraud Functions & RLS</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFullSql}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedFull ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFull ? 'Copied' : 'Copy SQL'}</span>
                </button>
                <button
                  onClick={handleDownloadSql}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsBackendDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Sub-tabs */}
            <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <button
                onClick={() => setBackendTab('sql')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  backendTab === 'sql' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SQL Schema</span>
              </button>
              <button
                onClick={() => setBackendTab('simulator')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  backendTab === 'simulator' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Trigger Simulator</span>
              </button>
              <button
                onClick={() => setBackendTab('erd')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  backendTab === 'erd' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>ERD Architecture</span>
              </button>
              <button
                onClick={() => setBackendTab('rls')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  backendTab === 'rls' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>RLS Matrix</span>
              </button>
              <button
                onClick={() => setBackendTab('guide')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  backendTab === 'guide' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Deploy Guide</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {backendTab === 'sql' && <SqlViewer onCopyText={handleCopyText} copied={copiedFull} />}
              {backendTab === 'simulator' && <TriggerSimulator />}
              {backendTab === 'erd' && <SchemaErd />}
              {backendTab === 'rls' && <RlsMatrix />}
              {backendTab === 'guide' && <SupabaseGuide onCopyText={handleCopyText} />}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-black text-xs font-bold shadow-2xl border border-cyan-400/40 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-black stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
