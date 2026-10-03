import React, { useState } from 'react';
import { TABLES, TableDef } from '../data/schemaDefinitions';
import { Key, Link, ShieldCheck, Zap, Database, ArrowRight } from 'lucide-react';

export const SchemaErd: React.FC = () => {
  const [selectedTableName, setSelectedTableName] = useState<string>('customer_cards');
  const [filterQuery, setFilterQuery] = useState<string>('');

  const selectedTable: TableDef = TABLES.find(t => t.name === selectedTableName) || TABLES[0];

  const filteredTables = TABLES.filter(t => 
    t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Architecture Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <span>Multi-Tenant Architecture</span>
              <span aria-hidden="true">·</span>
              <span>Foreign Key Relationships</span>
              <span aria-hidden="true">·</span>
              <span>Data Dictionary</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Database Entity-Relationship & Schema Dictionary
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Every child entity cascades directly from <code className="text-emerald-300 font-mono">tenants</code> for strict multi-tenant boundary containment.
              Cards are uniquely scoped by <code className="text-cyan-300 font-mono">(tenant_id, customer_id, program_id)</code>.
            </p>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 shrink-0">
            <span className="font-semibold text-white">6</span> Tables · <span className="font-semibold text-white">9</span> Foreign Keys · <span className="font-semibold text-white">7</span> Triggers
          </div>
        </div>

        {/* Visual Relational Flow Map */}
        <div className="mt-6 pt-6 border-t border-slate-800 overflow-x-auto pb-2">
          <div className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
            Cascade Dependency Graph
          </div>
          <div className="flex items-center gap-2 text-xs font-mono min-w-[700px]">
            <button
              onClick={() => setSelectedTableName('tenants')}
              className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                selectedTableName === 'tenants'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              🏢 tenants (Root)
            </button>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedTableName('merchant_users')}
                className={`px-2.5 py-1 rounded border text-left transition-colors cursor-pointer ${
                  selectedTableName === 'merchant_users'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                merchant_users (auth.uid())
              </button>
              <button
                onClick={() => setSelectedTableName('loyalty_programs')}
                className={`px-2.5 py-1 rounded border text-left transition-colors cursor-pointer ${
                  selectedTableName === 'loyalty_programs'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                loyalty_programs (thresholds)
              </button>
              <button
                onClick={() => setSelectedTableName('customers')}
                className={`px-2.5 py-1 rounded border text-left transition-colors cursor-pointer ${
                  selectedTableName === 'customers'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                customers (patrons)
              </button>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            <button
              onClick={() => setSelectedTableName('customer_cards')}
              className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                selectedTableName === 'customer_cards'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              💳 customer_cards (cycles & balances)
            </button>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            <button
              onClick={() => setSelectedTableName('stamp_transactions')}
              className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                selectedTableName === 'stamp_transactions'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              📜 stamp_transactions (immutable ledger)
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Table Navigation List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Database Tables</span>
            <span className="text-xs text-slate-500">{filteredTables.length} total</span>
          </div>

          <div className="space-y-2">
            {filteredTables.map((tbl) => {
              const isSelected = tbl.name === selectedTableName;
              return (
                <button
                  key={tbl.name}
                  onClick={() => setSelectedTableName(tbl.name)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 shadow-md text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      {tbl.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {tbl.columns.length} cols
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {tbl.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Table Inspector */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            {/* Table Header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-mono font-bold text-white">
                    public.{selectedTable.name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    RLS ENABLED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedTable.description}</p>
              </div>
            </div>

            {/* Columns Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/40 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-4">Column</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Attributes</th>
                    <th className="py-2.5 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {selectedTable.columns.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        <div className="flex items-center gap-1.5">
                          {col.isPrimary && (
                            <span title="Primary Key">
                              <Key className="w-3.5 h-3.5 text-amber-400" />
                            </span>
                          )}
                          {col.references && (
                            <span title={`Foreign Key references ${col.references.table}.${col.references.column}`}>
                              <Link className="w-3.5 h-3.5 text-cyan-400" />
                            </span>
                          )}
                          <span>{col.name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-cyan-400">
                        {col.type}
                      </td>

                      <td className="py-3 px-4 text-slate-400 space-y-1">
                        {col.isPrimary && (
                          <div className="text-[11px] text-amber-400">PK</div>
                        )}
                        {!col.isNullable && !col.isPrimary && (
                          <div className="text-[11px] text-rose-400">NOT NULL</div>
                        )}
                        {col.defaultValue && (
                          <div className="text-[11px] text-slate-500">
                            def: {col.defaultValue}
                          </div>
                        )}
                        {col.references && (
                          <div className="text-[11px] text-cyan-400">
                            -&gt; {col.references.table}({col.references.column})
                          </div>
                        )}
                        {col.checkConstraint && (
                          <div className="text-[11px] text-purple-400">
                            CHECK: {col.checkConstraint}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-sans text-slate-300">
                        {col.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Unique Constraints & Triggers attached */}
            <div className="p-4 bg-slate-900/50 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-300 block mb-1">Unique & Check Constraints:</span>
                {selectedTable.uniqueConstraints.length > 0 ? (
                  <ul className="list-disc list-inside font-mono text-slate-400 space-y-0.5">
                    {selectedTable.uniqueConstraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-500">None beyond PRIMARY KEY</span>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  Database Triggers:
                </span>
                {selectedTable.triggers.length > 0 ? (
                  <ul className="font-mono text-emerald-400/90 space-y-0.5">
                    {selectedTable.triggers.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-500">No triggers</span>
                )}
              </div>
            </div>
          </div>

          {/* Table Specific RLS Policies */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Row-Level Security Policies on {selectedTable.name}
            </h4>
            <div className="space-y-2">
              {selectedTable.rlsPolicies.map((pol, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-900/50">
                        {pol.command}
                      </span>
                      <span className="font-medium text-white">{pol.name}</span>
                    </div>
                    <p className="text-slate-400 mt-1">{pol.rationale}</p>
                  </div>
                  <div className="font-mono text-[11px] text-cyan-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 shrink-0">
                    USING: {pol.clause}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
