import React, { useState } from 'react';
import { TABLES } from '../data/schemaDefinitions';
import { ShieldCheck, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

export const RlsMatrix: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const allPolicies = TABLES.flatMap(table => 
    table.rlsPolicies.map(policy => ({
      table: table.name,
      ...policy
    }))
  );

  const filteredPolicies = allPolicies.filter(p => {
    if (selectedRole === 'all') return true;
    return p.role.toLowerCase().includes(selectedRole.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <span>Security Invariants</span>
              <span aria-hidden="true">·</span>
              <span>Supabase auth.uid() Isolation</span>
              <span aria-hidden="true">·</span>
              <span>Tenant Perimeter Defense</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
              Row-Level Security (RLS) Policy Matrix & Tenancy Rules
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Every table enforces tenant boundary confinement. Queries automatically resolve against the caller's <code className="text-emerald-400 font-mono">auth.uid()</code> and
              its corresponding <code className="text-emerald-400 font-mono">merchant_users.tenant_id</code>.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedRole('all')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedRole === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setSelectedRole('owner')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedRole === 'owner' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Owners
            </button>
            <button
              onClick={() => setSelectedRole('staff')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedRole === 'staff' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Staff
            </button>
          </div>
        </div>

        {/* 3 Core Security Invariants */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 font-semibold text-emerald-400 mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero Cross-Tenant Leakage</span>
            </div>
            <p className="text-slate-400">
              Users can never query, insert, or modify rows belonging to another organization. All USING clauses enforce <code className="text-slate-300 font-mono">tenant_id = get_auth_tenant_id()</code>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 font-semibold text-cyan-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Immutable Ledger Guard</span>
            </div>
            <p className="text-slate-400">
              <code className="text-slate-300 font-mono">stamp_transactions</code> has UPDATE and DELETE policies hardcoded to <code className="text-rose-400 font-mono">USING (FALSE)</code> to eliminate ledger tampering.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 font-semibold text-purple-400 mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Role Escalation Block</span>
            </div>
            <p className="text-slate-400">
              Merchant staff cannot self-elevate to manager or owner. Role changes require verified owner permissions evaluated via <code className="text-slate-300 font-mono">get_auth_merchant_role()</code>.
            </p>
          </div>
        </div>
      </div>

      {/* RLS Policies Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Complete Policy Specification Matrix ({filteredPolicies.length} Active Policies)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            ENGINE: PostgreSQL 15 RLS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-4">Target Table</th>
                <th className="py-3 px-4">Command</th>
                <th className="py-3 px-4">Policy Name</th>
                <th className="py-3 px-4">Permitted Roles</th>
                <th className="py-3 px-4">USING / CHECK Condition</th>
                <th className="py-3 px-4">Security Invariant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredPolicies.map((pol, idx) => {
                const isBlocked = pol.clause === 'FALSE';
                return (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      {pol.table}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        pol.command === 'SELECT'
                          ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                          : pol.command === 'INSERT'
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                          : pol.command === 'UPDATE'
                          ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                          : 'bg-rose-950/60 border-rose-800 text-rose-300'
                      }`}>
                        {pol.command}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-white font-medium">
                      {pol.name}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-mono text-[11px] text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {pol.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-xs">
                      {isBlocked ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          FALSE (Strictly Prohibited)
                        </span>
                      ) : (
                        <span className="text-slate-300 break-words">{pol.clause}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {pol.rationale}
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
};
