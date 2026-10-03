import React, { useState, useMemo } from 'react';
import { COMPLETE_SQL_SCRIPT, SQL_SECTIONS } from '../data/schemaSql';
import { Copy, Check, Search, FileCode2, Zap, Shield, Sparkles } from 'lucide-react';

interface SqlViewerProps {
  onCopyText: (text: string) => void;
  copied: boolean;
}

export const SqlViewer: React.FC<SqlViewerProps> = ({ onCopyText, copied }) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSection, setCopiedSection] = useState<boolean>(false);

  const activeContent = useMemo(() => {
    if (selectedSectionId === 'all') {
      return COMPLETE_SQL_SCRIPT;
    }
    const sec = SQL_SECTIONS.find(s => s.id === selectedSectionId);
    return sec ? sec.sql : COMPLETE_SQL_SCRIPT;
  }, [selectedSectionId]);

  const lines = useMemo(() => {
    return activeContent.split('\n');
  }, [activeContent]);

  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return lines;
    return lines;
  }, [lines, searchQuery]);

  const handleCopySection = () => {
    onCopyText(activeContent);
    setCopiedSection(true);
    setTimeout(() => setCopiedSection(false), 2000);
  };

  const currentSectionMeta = SQL_SECTIONS.find(s => s.id === selectedSectionId);

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <span>PostgreSQL 15+</span>
              <span aria-hidden="true">·</span>
              <span>Supabase RLS Enabled</span>
              <span aria-hidden="true">·</span>
              <span>Production Ready</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
              Multi-Tenant Loyalty Stamp SaaS PostgreSQL Setup Script
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Complete DDL with 6 core tables, strict tenant-scoped Row-Level Security, automated updated_at timestamps,
              cycle completion roll-over trigger, cooldown fraud prevention, and atomic stamping RPC.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleCopySection}
              className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {copied || copiedSection ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied || copiedSection ? 'Copied to Clipboard' : 'Copy Displayed SQL'}</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-medium text-emerald-400 mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>RLS Isolation</span>
            </div>
            <p className="text-slate-400">auth.uid() linked to merchant_users with tenant_id boundaries on every query.</p>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-medium text-emerald-400 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Automated Cycle Roll-Over</span>
            </div>
            <p className="text-slate-400">Triggers auto-increment completed cycles & reset remainder when threshold is met.</p>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-medium text-emerald-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Anti-Fraud Cooldown</span>
            </div>
            <p className="text-slate-400">Prevents cashier double-punching via configurable cooldown_minutes.</p>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-medium text-emerald-400 mb-1">
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Immutable Ledger</span>
            </div>
            <p className="text-slate-400">stamp_transactions is append-only; updates & deletes are blocked by RLS.</p>
          </div>
        </div>
      </div>

      {/* Code Browser Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Navigation & Toolbar */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Section Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedSectionId('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedSectionId === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Full Script ({COMPLETE_SQL_SCRIPT.split('\n').length} lines)
            </button>
            {SQL_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSelectedSectionId(sec.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  selectedSectionId === sec.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {sec.title}
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SQL keywords..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Section Description Bar */}
        {currentSectionMeta && (
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>{currentSectionMeta.description}</span>
            <span className="font-mono text-slate-500">{filteredLines.length} lines</span>
          </div>
        )}

        {/* Code Content with Line Numbers */}
        <div className="max-h-[640px] overflow-auto font-mono text-xs leading-relaxed p-4 select-text">
          <pre className="table w-full border-collapse">
            <tbody>
              {filteredLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isComment = line.trim().startsWith('--') || line.trim().startsWith('/*') || line.trim().startsWith('*');
                const isHighlighted = searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase());

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-900/50 transition-colors ${
                      isHighlighted ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <td className="w-12 pr-4 text-right select-none text-slate-600 font-mono text-[11px] tabular-nums border-r border-slate-800/60">
                      {lineNum}
                    </td>
                    <td className="pl-4 whitespace-pre text-slate-300">
                      {formatSqlLine(line, isComment)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </pre>
        </div>
      </div>
    </div>
  );
};

// Subtle syntax formatting for SQL tokens
function formatSqlLine(line: string, isComment: boolean) {
  if (isComment) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  // Highlight keywords
  const keywords = [
    'CREATE TABLE IF NOT EXISTS',
    'CREATE TABLE',
    'CREATE OR REPLACE FUNCTION',
    'CREATE TRIGGER',
    'CREATE POLICY',
    'CREATE INDEX IF NOT EXISTS',
    'CREATE EXTENSION IF NOT EXISTS',
    'ALTER TABLE',
    'ENABLE ROW LEVEL SECURITY',
    'PRIMARY KEY',
    'DEFAULT',
    'NOT NULL',
    'CHECK',
    'REFERENCES',
    'ON DELETE CASCADE',
    'ON DELETE SET NULL',
    'UNIQUE',
    'CONSTRAINT',
    'BEFORE UPDATE',
    'BEFORE INSERT OR UPDATE',
    'AFTER INSERT',
    'FOR EACH ROW EXECUTE FUNCTION',
    'RETURNS TRIGGER',
    'RETURNS JSONB',
    'RETURNS UUID',
    'RETURNS BOOLEAN',
    'LANGUAGE plpgsql',
    'LANGUAGE sql',
    'SECURITY DEFINER',
    'STABLE',
    'SET search_path = public',
    'BEGIN',
    'END;',
    'DECLARE',
    'IF',
    'THEN',
    'ELSE',
    'END IF;',
    'FOR SELECT',
    'FOR INSERT',
    'FOR UPDATE',
    'FOR DELETE',
    'USING',
    'WITH CHECK',
    'SELECT',
    'INSERT INTO',
    'UPDATE',
    'DELETE',
    'VALUES',
    'RETURNING',
    'WHERE',
    'AND',
    'OR'
  ];

  // Regex pattern matching common keywords
  const pattern = new RegExp(`\\b(${keywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'g');

  const parts = line.split(pattern);

  return parts.map((part, i) => {
    if (keywords.includes(part)) {
      return (
        <span key={i} className="text-emerald-400 font-semibold">
          {part}
        </span>
      );
    }
    // Highlighting types
    if (['UUID', 'TEXT', 'INTEGER', 'BOOLEAN', 'TIMESTAMPTZ', 'JSONB', 'RECORD'].includes(part.trim())) {
      return (
        <span key={i} className="text-cyan-400">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
