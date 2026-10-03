import React, { useState } from 'react';
import { 
  Zap, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Award, 
  History, 
  Building2,
  AlertTriangle,
  Play
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
}

interface MerchantUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: 'owner' | 'staff';
}

interface LoyaltyProgram {
  id: string;
  tenantId: string;
  title: string;
  requiredStamps: number;
  rewardDescription: string;
  cooldownMinutes: number;
}

interface CustomerCard {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  programId: string;
  currentStamps: number;
  totalCompletedCycles: number;
  lastStampedAt: Date | null;
  updatedAt: Date;
}

interface StampTransaction {
  id: string;
  tenantId: string;
  cardId: string;
  staffUserId: string;
  staffName: string;
  type: string;
  stampsChanged: number;
  createdAt: Date;
  outcomeNote: string;
}

const SAMPLE_TENANTS: Tenant[] = [
  { id: 't-100', name: 'Roast & Ritual Coffee', slug: 'roast-ritual', primaryColor: '#059669' },
  { id: 't-200', name: 'Crust & Crumb Bakery', slug: 'crust-crumb', primaryColor: '#D97706' }
];

const SAMPLE_USERS: MerchantUser[] = [
  { id: 'u-1', tenantId: 't-100', name: 'Elena (Store Owner)', email: 'elena@roastritual.com', role: 'owner' },
  { id: 'u-2', tenantId: 't-100', name: 'Liam (Cashier Staff)', email: 'liam@roastritual.com', role: 'staff' },
  { id: 'u-3', tenantId: 't-200', name: 'Chloe (Crust Bakery Owner)', email: 'chloe@crustcrumb.com', role: 'owner' }
];

const SAMPLE_PROGRAMS: LoyaltyProgram[] = [
  {
    id: 'prog-1',
    tenantId: 't-100',
    title: 'Espresso Punch Club',
    requiredStamps: 8,
    rewardDescription: 'Free Specialty Pour-Over or Latte',
    cooldownMinutes: 2
  },
  {
    id: 'prog-2',
    tenantId: 't-200',
    title: 'Sourdough & Croissant Loyalty',
    requiredStamps: 6,
    rewardDescription: 'Free Sourdough Artisan Loaf',
    cooldownMinutes: 5
  }
];

export const TriggerSimulator: React.FC = () => {
  // Simulator State
  const [currentUserId, setCurrentUserId] = useState<string>('u-2'); // Liam (Staff at Roast & Ritual)
  const [activeTenantId, setActiveTenantId] = useState<string>('t-100');
  
  // Card state for customer "Sarah Jenkins"
  const [card, setCard] = useState<CustomerCard>({
    id: 'card-901',
    tenantId: 't-100',
    customerId: 'cust-501',
    customerName: 'Sarah Jenkins',
    customerPhone: '+1 (555) 234-8901',
    programId: 'prog-1',
    currentStamps: 6,
    totalCompletedCycles: 1,
    lastStampedAt: null,
    updatedAt: new Date(Date.now() - 3600000)
  });

  const [transactions, setTransactions] = useState<StampTransaction[]>([
    {
      id: 'tx-001',
      tenantId: 't-100',
      cardId: 'card-901',
      staffUserId: 'u-2',
      staffName: 'Liam (Cashier Staff)',
      type: 'stamp_added',
      stampsChanged: 6,
      createdAt: new Date(Date.now() - 7200000),
      outcomeNote: 'Card initialized with 6 stamps'
    }
  ]);

  const [executionLog, setExecutionLog] = useState<{
    timestamp: string;
    type: 'success' | 'error' | 'cycle_unlock' | 'info';
    message: string;
    details?: string;
  }[]>([]);

  const [cooldownBypass, setCooldownBypass] = useState<boolean>(false);
  const [stampsToAddInput, setStampsToAddInput] = useState<number>(1);

  const currentUser = SAMPLE_USERS.find(u => u.id === currentUserId)!;
  const currentTenant = SAMPLE_TENANTS.find(t => t.id === activeTenantId)!;
  const activeProgram = SAMPLE_PROGRAMS.find(p => p.id === card.programId)!;

  // Simulate SQL Trigger Execution: issue_customer_stamps() + trg_process_stamp_transaction()
  const handleIssueStamp = (stampsDelta: number) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();

    // 1. RLS Tenant Isolation Check:
    // "WHERE id = auth.uid() AND tenant_id = v_caller_tenant_id"
    if (currentUser.tenantId !== card.tenantId) {
      const errMsg = `[PostgreSQL RLS / Trigger Error]: Tenant isolation violation! Caller (${currentUser.name}, tenant ${currentUser.tenantId}) cannot stamp card belonging to tenant (${card.tenantId}).`;
      setExecutionLog(prev => [
        {
          timestamp: timeStr,
          type: 'error',
          message: 'Cross-Tenant Violation Caught by RLS / fn_process_stamp_transaction()',
          details: errMsg
        },
        ...prev
      ]);
      return;
    }

    // 2. Cooldown check:
    // "IF NEW.type = 'stamp_added' AND NEW.stamps_changed > 0 AND v_program.cooldown_minutes > 0 THEN..."
    if (!cooldownBypass && stampsDelta > 0 && activeProgram.cooldownMinutes > 0 && card.lastStampedAt) {
      const diffMs = now.getTime() - card.lastStampedAt.getTime();
      const diffMinutes = diffMs / 60000;
      if (diffMinutes < activeProgram.cooldownMinutes) {
        const remainingSeconds = Math.ceil((activeProgram.cooldownMinutes * 60) - (diffMs / 1000));
        const cooldownMsg = `[PostgreSQL RAISE EXCEPTION]: Anti-fraud cooldown active: You must wait ${activeProgram.cooldownMinutes} minutes between stamps. Remaining wait: ${remainingSeconds}s.`;
        setExecutionLog(prev => [
          {
            timestamp: timeStr,
            type: 'error',
            message: 'Anti-Fraud Cooldown Blocked Transaction',
            details: cooldownMsg
          },
          ...prev
        ]);
        return;
      }
    }

    // 3. Process Stamp Calculations & Automatic Cycle Roll-Over Trigger:
    // v_new_stamps := v_card.current_stamps + NEW.stamps_changed;
    // IF v_new_stamps >= v_program.required_stamps THEN
    //    v_cycles_to_add := v_new_stamps / v_program.required_stamps;
    //    v_final_stamps := v_new_stamps % v_program.required_stamps;
    const previousStamps = card.currentStamps;
    const rawNewStamps = previousStamps + stampsDelta;

    if (rawNewStamps < 0) {
      setExecutionLog(prev => [
        {
          timestamp: timeStr,
          type: 'error',
          message: 'CHECK Constraint Violation',
          details: 'current_stamps cannot be negative.'
        },
        ...prev
      ]);
      return;
    }

    let cyclesToAdd = 0;
    let finalStamps = rawNewStamps;

    if (rawNewStamps >= activeProgram.requiredStamps) {
      cyclesToAdd = Math.floor(rawNewStamps / activeProgram.requiredStamps);
      finalStamps = rawNewStamps % activeProgram.requiredStamps;
    }

    const newCompletedCycles = card.totalCompletedCycles + cyclesToAdd;

    // Update Customer Card
    const updatedCard: CustomerCard = {
      ...card,
      currentStamps: finalStamps,
      totalCompletedCycles: newCompletedCycles,
      lastStampedAt: now,
      updatedAt: now
    };
    setCard(updatedCard);

    // Append to transactions table
    const newTx: StampTransaction = {
      id: `tx-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: card.tenantId,
      cardId: card.id,
      staffUserId: currentUser.id,
      staffName: currentUser.name,
      type: stampsDelta > 0 ? 'stamp_added' : 'stamp_removed',
      stampsChanged: stampsDelta,
      createdAt: now,
      outcomeNote: cyclesToAdd > 0 
        ? `Added ${stampsDelta} stamp(s). Threshold (${activeProgram.requiredStamps}) reached! Auto-unlocked ${cyclesToAdd} reward cycle(s). Stamps reset to ${finalStamps}.`
        : `Added ${stampsDelta} stamp(s). Card balance updated: ${previousStamps} -> ${finalStamps}.`
    };
    setTransactions(prev => [newTx, ...prev]);

    // Log Execution Event
    if (cyclesToAdd > 0) {
      setExecutionLog(prev => [
        {
          timestamp: timeStr,
          type: 'cycle_unlock',
          message: `REWARD CYCLE COMPLETED! (Cycle #${newCompletedCycles} Unlocked)`,
          details: `Threshold ${activeProgram.requiredStamps} stamps reached. Auto-cycled ${cyclesToAdd} time(s). Remainder stamps: ${finalStamps}. Reward: "${activeProgram.rewardDescription}"`
        },
        {
          timestamp: timeStr,
          type: 'success',
          message: `trg_process_stamp_transaction executed successfully. updated_at = NOW()`,
          details: `Transaction ${newTx.id} committed. customer_cards row updated atomically.`
        },
        ...prev
      ]);
    } else {
      setExecutionLog(prev => [
        {
          timestamp: timeStr,
          type: 'success',
          message: `Stamp transaction processed (+${stampsDelta} stamp)`,
          details: `Balance: ${previousStamps} -> ${finalStamps} / ${activeProgram.requiredStamps} required. updated_at updated.`
        },
        ...prev
      ]);
    }
  };

  const handleResetCard = () => {
    setCard({
      id: 'card-901',
      tenantId: 't-100',
      customerId: 'cust-501',
      customerName: 'Sarah Jenkins',
      customerPhone: '+1 (555) 234-8901',
      programId: 'prog-1',
      currentStamps: 0,
      totalCompletedCycles: 0,
      lastStampedAt: null,
      updatedAt: new Date()
    });
    setExecutionLog(prev => [
      {
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: 'Card state reset to 0 stamps & 0 cycles for testing.'
      },
      ...prev
    ]);
  };

  const progressPercent = Math.min(100, Math.round((card.currentStamps / activeProgram.requiredStamps) * 100));

  return (
    <div className="space-y-6">
      {/* Simulator Control Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <span>Interactive Trigger Sandbox</span>
              <span aria-hidden="true">·</span>
              <span>PostgreSQL Logic Verification</span>
              <span aria-hidden="true">·</span>
              <span>Row-Level Security Sandbox</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
              Live PostgreSQL Trigger & Multi-Tenant Engine Simulator
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Simulates the execution of <code className="text-emerald-400 font-mono">trg_process_stamp_transaction</code>,
              <code className="text-emerald-400 font-mono"> trg_guard_customer_card_cycles</code>, and RLS tenant boundaries in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCard}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Card Balance
            </button>
          </div>
        </div>

        {/* Identity & Context Switcher */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Active Auth User (auth.uid()) */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1.5">
              Simulated Auth User (auth.uid())
            </label>
            <select
              value={currentUserId}
              onChange={(e) => {
                const uid = e.target.value;
                setCurrentUserId(uid);
                const u = SAMPLE_USERS.find(x => x.id === uid);
                if (u) setActiveTenantId(u.tenantId);
              }}
              aria-label="Simulated Auth User"
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {SAMPLE_USERS.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} [{u.role.toUpperCase()}] ({u.tenantId === 't-100' ? 'Roast & Ritual' : 'Crust & Crumb'})
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              Tenant ID: {currentUser.tenantId}
            </div>
          </div>

          {/* Target Loyalty Card */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1.5">
              Target Customer Card
            </label>
            <div className="text-white font-medium flex items-center justify-between">
              <span>{card.customerName}</span>
              <span className="font-mono text-[11px] text-emerald-400">{card.customerPhone}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono flex items-center justify-between">
              <span>Card Tenant: {card.tenantId}</span>
              <span>Prog: {activeProgram.requiredStamps} stamps required</span>
            </div>
          </div>

          {/* Cooldown Settings */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Anti-Fraud Cooldown
                </span>
                <span className="font-mono text-cyan-400 text-xs">
                  {activeProgram.cooldownMinutes} min rule
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {card.lastStampedAt 
                  ? `Last stamped: ${card.lastStampedAt.toLocaleTimeString()}`
                  : 'No stamp recorded yet'}
              </p>
            </div>
            <label className="flex items-center gap-2 mt-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={cooldownBypass}
                onChange={(e) => setCooldownBypass(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-0 bg-slate-900"
              />
              <span>Fast-Forward Clock (Bypass Cooldown)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Punch Card & Stamping Controls */}
        <div className="lg:col-span-6 space-y-6">
          {/* Visual Digital Loyalty Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {SAMPLE_TENANTS.find(t => t.id === card.tenantId)?.name}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {activeProgram.title}
                </h3>
                <p className="text-xs text-emerald-400/90 mt-0.5">
                  Reward: {activeProgram.rewardDescription}
                </p>
              </div>

              {/* Total Completed Cycles Badge */}
              <div className="text-right">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-xs">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>
                    <strong className="text-white font-bold">{card.totalCompletedCycles}</strong> Completed Cycles
                  </span>
                </div>
              </div>
            </div>

            {/* Stamp Holes Grid (Interactive visual representation of required_stamps) */}
            <div className="my-6">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Current Cycle Progress</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {card.currentStamps} / {activeProgram.requiredStamps} Stamps ({progressPercent}%)
                </span>
              </div>

              {/* Grid of Punch Holes */}
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
                {Array.from({ length: activeProgram.requiredStamps }).map((_, index) => {
                  const isStamped = index < card.currentStamps;
                  const isNext = index === card.currentStamps;

                  return (
                    <div
                      key={index}
                      className={`h-16 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        isStamped
                          ? 'bg-emerald-600/20 border-emerald-500/80 text-emerald-400 shadow-inner'
                          : isNext
                          ? 'bg-slate-900 border-dashed border-emerald-500/40 text-slate-500 animate-pulse'
                          : 'bg-slate-900/60 border-slate-800 text-slate-600'
                      }`}
                    >
                      {isStamped ? (
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="text-[10px] font-mono font-bold">PUNCHED</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono text-sm font-semibold">{index + 1}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500">
                            {index + 1 === activeProgram.requiredStamps ? 'REWARD' : 'STAMP'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timestamps & Invariants */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono">
              <div>
                <span>updated_at: </span>
                <span className="text-slate-400">{card.updatedAt.toLocaleTimeString()}</span>
              </div>
              <div>
                <span>last_stamped_at: </span>
                <span className="text-slate-400">
                  {card.lastStampedAt ? card.lastStampedAt.toLocaleTimeString() : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons to Fire Postgres Triggers */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Simulate Stamping Action (Calls issue_customer_stamps RPC)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleIssueStamp(1)}
                className="py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>+1 Stamp (Standard)</span>
              </button>

              <button
                onClick={() => handleIssueStamp(2)}
                className="py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>+2 Stamps (Double)</span>
              </button>

              <button
                onClick={() => handleIssueStamp(activeProgram.requiredStamps - card.currentStamps)}
                className="py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Complete Cycle (+{activeProgram.requiredStamps - card.currentStamps})</span>
              </button>
            </div>

            {/* Custom Stamp Input */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs text-slate-400">Custom Stamps Delta:</span>
              <input
                type="number"
                value={stampsToAddInput}
                onChange={(e) => setStampsToAddInput(parseInt(e.target.value) || 1)}
                className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleIssueStamp(stampsToAddInput)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700 cursor-pointer"
              >
                Execute Delta
              </button>
            </div>

            {/* Explanatory notes on what this tests */}
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800 leading-relaxed">
              <strong className="text-slate-300">Trigger Invariant Test:</strong> If current stamps + stamps changed &gt;= {activeProgram.requiredStamps},
              the trigger automatically increments <code className="text-emerald-400 font-mono">total_completed_cycles</code> and resets
              <code className="text-emerald-400 font-mono"> current_stamps</code> to the remainder without requiring manual application recalculation!
            </div>
          </div>
        </div>

        {/* Right Column: Execution Console & Audit Ledger */}
        <div className="lg:col-span-6 space-y-6">
          {/* Live Trigger Execution Log */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Trigger Execution Console & Invariants
              </h4>
              <button
                onClick={() => setExecutionLog([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Clear Log
              </button>
            </div>

            <div className="p-4 max-h-72 overflow-y-auto font-mono text-xs space-y-2.5 bg-slate-950/80">
              {executionLog.length === 0 ? (
                <div className="text-slate-600 text-center py-8">
                  Click "+1 Stamp" above to watch trigger execution logs and SQL invariants fire.
                </div>
              ) : (
                executionLog.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border leading-snug ${
                      log.type === 'cycle_unlock'
                        ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                        : log.type === 'error'
                        ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                        : log.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1 opacity-80">
                      <span className="font-bold flex items-center gap-1.5">
                        {log.type === 'cycle_unlock' && <Award className="w-3.5 h-3.5 text-amber-400" />}
                        {log.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                        {log.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {log.message}
                      </span>
                      <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                    </div>
                    {log.details && (
                      <div className="text-[11px] opacity-90 text-slate-300">
                        {log.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Immutable Stamp Transactions Audit Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                stamp_transactions (Immutable Audit Ledger)
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {transactions.length} recorded
              </span>
            </div>

            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-slate-900/60 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">TX ID</th>
                    <th className="py-2 px-3">Staff</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Change</th>
                    <th className="py-2 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/30">
                      <td className="py-2 px-3 font-semibold text-emerald-400">{tx.id}</td>
                      <td className="py-2 px-3 text-slate-300">{tx.staffName}</td>
                      <td className="py-2 px-3 text-cyan-400">{tx.type}</td>
                      <td className="py-2 px-3">
                        <span className={`font-bold ${tx.stampsChanged > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.stampsChanged > 0 ? `+${tx.stampsChanged}` : tx.stampsChanged}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {tx.createdAt.toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-900/30 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>RLS Enforcement: UPDATE & DELETE blocked</span>
              <span className="text-emerald-400 font-mono">APPEND-ONLY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
