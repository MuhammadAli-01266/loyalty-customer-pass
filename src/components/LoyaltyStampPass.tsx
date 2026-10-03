"use client";

import React, { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  QrCode,
  Sparkles,
  Gift,
  Coffee,
  Check,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X,
  CheckCircle2,
  Copy,
  Radio,
  ChevronDown,
} from "lucide-react";
import { 
  supabase, 
  fetchLiveCustomerCard, 
  fetchLiveStamps, 
  generateTotpQrPayload,
  PRESET_CUSTOMERS,
  CustomerPreset,
  LiveStampItem,
  LiveCardData
} from "../lib/supabase";

export interface LoyaltyStampPassProps {
  tenantName?: string;
  tenantLocation?: string;
  customerName?: string;
  memberId?: string;
  tier?: string;
  totalStamps?: number;
  currentStamps?: number;
  rewardTitle?: string;
}

export default function LoyaltyStampPass({
  tenantName: defaultTenantName = "Blue Bottle Coffee",
  tenantLocation: defaultTenantLocation = "Hayes Valley • 315 Linden St, SF",
  customerName: defaultCustomerName = "Elena Rostova",
  memberId: defaultMemberId = "88-849204",
  tier: defaultTier = "Gold Brew Club",
  totalStamps: defaultTotalStamps = 7,
  currentStamps: defaultCurrentStamps = 6,
  rewardTitle: defaultRewardTitle = "Free Handcrafted Coffee",
}: LoyaltyStampPassProps) {
  // Active Customer Selection State (Defaults to Elena Rostova: ID 88-849204)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(defaultMemberId);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState<boolean>(false);
  const [customIdInput, setCustomIdInput] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"pass" | "history" | "benefits">("pass");
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(30);
  const [totpToken, setTotpToken] = useState("892-410");
  const [sessionToken, setSessionToken] = useState<string>(() => `sess_${Math.random().toString(36).substring(2, 10)}`);
  
  // Realtime Supabase State
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "fallback">("connecting");
  const [liveCard, setLiveCard] = useState<LiveCardData | null>(null);
  const [liveStampsHistory, setLiveStampsHistory] = useState<LiveStampItem[]>([]);
  const [currentStamps, setCurrentStamps] = useState<number>(defaultCurrentStamps);
  const [copiedPayloadToast, setCopiedPayloadToast] = useState(false);
  const [realtimeBanner, setRealtimeBanner] = useState<string | null>(null);

  // Derived Values from active card/member
  const memberId = liveCard?.member_id || selectedMemberId;
  const activeCardId = liveCard?.id || selectedMemberId;
  const tenantName = liveCard?.tenant_name || defaultTenantName;
  const tenantLocation = liveCard?.tenant_location || defaultTenantLocation;
  const customerName = liveCard?.customer_name || defaultCustomerName;
  const tier = liveCard?.tier || defaultTier;
  const totalStamps = liveCard?.total_stamps || defaultTotalStamps;
  const rewardTitle = liveCard?.reward_title || defaultRewardTitle;

  const progressPercent = Math.min(100, Math.round((currentStamps / totalStamps) * 100));
  const stampsRemaining = Math.max(0, totalStamps - currentStamps);
  const isRewardUnlocked = currentStamps >= totalStamps;

  // Web Audio Synthesized Chime (Plays purely upon genuine Merchant App Realtime events)
  const playChime = (isReward = false) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (isReward) {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.5);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (_) {}
  };

  // Confetti Animation over Card on Realtime Reward Unlock
  const triggerConfetti = (isReward = false) => {
    try {
      if (isReward) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.55 },
          colors: ["#00A3E0", "#F59E0B", "#10B981", "#38BDF8", "#FFFFFF"]
        });
      } else {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.5 },
          colors: ["#00A3E0", "#F59E0B", "#38BDF8"]
        });
      }
    } catch (_) {}
  };

  // 1. Fetch live customer card and stamp data from Supabase whenever selectedMemberId changes
  useEffect(() => {
    let isMounted = true;

    async function loadSupabaseData() {
      setRealtimeStatus("connecting");
      const { data: cardData } = await fetchLiveCustomerCard(selectedMemberId);
      
      if (!isMounted) return;

      if (cardData) {
        setLiveCard(cardData);
        setCurrentStamps(cardData.current_stamps);
        if (cardData.session_token) {
          setSessionToken(cardData.session_token);
        }
      }

      // Fetch stamps history
      const cardId = cardData?.id || selectedMemberId;
      const { data: stamps } = await fetchLiveStamps(cardId);
      if (isMounted && stamps.length > 0) {
        setLiveStampsHistory(stamps);
      } else if (isMounted) {
        // Preset history for active member
        setLiveStampsHistory([
          { id: "1", card_id: cardId, slot_number: 6, item_name: "1x Single-Origin Pour-over", created_at: "Today, 9:42 AM", location: "Hayes Valley", cashier_name: "Sam T." },
          { id: "2", card_id: cardId, slot_number: 5, item_name: "1x Cortado with Oat Milk", created_at: "Yesterday, 8:15 AM", location: "Hayes Valley", cashier_name: "Mia L." },
          { id: "3", card_id: cardId, slot_number: 4, item_name: "1x Gibraltar Espresso", created_at: "Sep 27, 2:30 PM", location: "Hayes Valley", cashier_name: "Sam T." },
          { id: "4", card_id: cardId, slot_number: 3, item_name: "1x Hayes Valley Espresso", created_at: "Sep 25, 9:05 AM", location: "Bryant Park", cashier_name: "David K." },
          { id: "5", card_id: cardId, slot_number: 2, item_name: "1x New Orleans Iced Coffee", created_at: "Sep 22, 10:12 AM", location: "Hayes Valley", cashier_name: "Elena R." },
        ]);
      }
    }

    loadSupabaseData();

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  // 2. SUPABASE REALTIME LISTENER: Subscribes directly to Postgres Realtime changes on 'cards' and 'stamps'
  useEffect(() => {
    const channelName = `realtime-loyalty-pass-${activeCardId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      // Listen for stamp creation/modification on 'stamps' table
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "stamps" 
        },
        (payload) => {
          const rec = payload.new as any;
          if (!rec) return;
          if (!rec.card_id || rec.card_id === activeCardId || rec.member_id === selectedMemberId || rec.card_id === selectedMemberId) {
            handleIncomingMerchantStamp(rec);
          }
        }
      )
      // Listen for audit ledger inserts on 'stamp_transactions'
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "stamp_transactions" 
        },
        (payload) => {
          const rec = payload.new as any;
          if (!rec) return;
          if (!rec.card_id || rec.card_id === activeCardId || rec.card_id === selectedMemberId) {
            handleIncomingMerchantStamp(rec);
          }
        }
      )
      // Listen for updates on 'cards' table for the active card
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "cards" 
        },
        (payload) => {
          const rec = payload.new as any;
          if (!rec) return;
          if (!rec.id || rec.id === activeCardId || rec.member_id === selectedMemberId) {
            handleIncomingMerchantCardUpdate(rec);
          }
        }
      )
      // Listen for updates on 'customer_cards' table
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "customer_cards" 
        },
        (payload) => {
          const rec = payload.new as any;
          if (!rec) return;
          if (!rec.id || rec.id === activeCardId || rec.customer_id === selectedMemberId) {
            handleIncomingMerchantCardUpdate(rec);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("fallback");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCardId, selectedMemberId, totalStamps]);

  // Handle incoming live stamp strictly from Merchant App
  const handleIncomingMerchantStamp = (newRecord: any) => {
    // Check if the merchant performed a reward redemption
    if (newRecord.type === "reward_redeemed" || newRecord.action === "redeem") {
      setLiveCard(prev => prev ? { ...prev, total_completed_cycles: (prev.total_completed_cycles || 0) + 1 } : null);
      setCurrentStamps(0);
      setRealtimeBanner(`🎁 Free Coffee Reward Redeemed for ${customerName}! Fresh card cycle started.`);
      playChime(true);
      triggerConfetti(true);
      setTimeout(() => setRealtimeBanner(null), 5000);
      return;
    }

    const next = typeof newRecord.slot_number === 'number' 
      ? newRecord.slot_number 
      : (typeof newRecord.stamps_count === 'number' ? newRecord.stamps_count : (currentStamps >= totalStamps ? 1 : currentStamps + 1));

    applyIncomingStampCount(next);

    setLiveStampsHistory((prev) => [
      {
        id: newRecord.id || `live-${Date.now()}`,
        card_id: newRecord.card_id || activeCardId,
        slot_number: next,
        created_at: newRecord.created_at || new Date().toISOString(),
        item_name: newRecord.item_name || "Merchant POS Awarded Stamp (+1)",
        cashier_name: newRecord.cashier_name || "Merchant App POS",
        location: newRecord.location || "Hayes Valley"
      },
      ...prev
    ]);
  };

  const handleIncomingMerchantCardUpdate = (cardRecord: any) => {
    if (typeof cardRecord.current_stamps === "number") {
      applyIncomingStampCount(cardRecord.current_stamps);
    }
    if (typeof cardRecord.total_completed_cycles === "number") {
      setLiveCard(prev => prev ? { ...prev, total_completed_cycles: cardRecord.total_completed_cycles } : null);
    }
  };

  const applyIncomingStampCount = (nextCount: number) => {
    setCurrentStamps(nextCount);
    const isReward = nextCount >= totalStamps;
    playChime(isReward);
    triggerConfetti(isReward);

    setRealtimeBanner(
      isReward 
        ? `🎉 7/7 Stamps for ${customerName}! Free Coffee Unlocked!` 
        : `☕ Merchant Awarded Stamp to ${customerName}! (${nextCount}/${totalStamps} Stamps)`
    );

    setTimeout(() => {
      setRealtimeBanner(null), 4500;
    });
  };

  // 3. 30-Second TOTP Auto-Rotation (Scanned by Merchant App)
  useEffect(() => {
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          const randomToken = Math.floor(100000 + Math.random() * 900000);
          setTotpToken(`${randomToken.toString().slice(0, 3)}-${randomToken.toString().slice(3)}`);
          setSessionToken(`sess_${Math.random().toString(36).substring(2, 10)}`);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Generate dynamic TOTP QR code payload using member_id & session token
  const qrPayload = useMemo(() => {
    return generateTotpQrPayload(selectedMemberId, sessionToken, totpToken);
  }, [selectedMemberId, sessionToken, totpToken]);

  // Deterministic SVG QR Code Pattern based on current QR Payload
  const qrGrid = useMemo(() => {
    const size = 21;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    let seed = 0;
    for (let i = 0; i < qrPayload.length; i++) {
      seed += qrPayload.charCodeAt(i) * (i + 1);
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isFinderTL = r < 7 && c < 7;
        const isFinderTR = r < 7 && c >= size - 7;
        const isFinderBL = r >= size - 7 && c < 7;

        if (isFinderTL || isFinderTR || isFinderBL) {
          const inBorder = (r === 0 || r === 6 || c === 0 || c === 6 || 
                            r === size - 7 || r === size - 1 || c === size - 7 || c === size - 1);
          const inCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
                           (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
                           (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4);
          grid[r][c] = inBorder || inCenter;
        } else if (r >= 9 && r <= 11 && c >= 9 && c <= 11) {
          grid[r][c] = false;
        } else {
          seed = (seed * 9301 + 49297) % 233280;
          grid[r][c] = seed % 3 === 0;
        }
      }
    }
    return grid;
  }, [qrPayload]);

  const copyPayloadToClipboard = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopiedPayloadToast(true);
    setTimeout(() => setCopiedPayloadToast(false), 2000);
  };

  const handleSelectCustomer = (member: CustomerPreset) => {
    setSelectedMemberId(member.member_id);
    setIsSwitcherOpen(false);
  };

  const handleCustomIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customIdInput.trim()) {
      setSelectedMemberId(customIdInput.trim());
      setIsSwitcherOpen(false);
      setCustomIdInput("");
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-white flex justify-center font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="w-full max-w-[420px] min-h-screen relative flex flex-col bg-[#090e1a] shadow-2xl overflow-hidden pb-8">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Realtime Stamp Notification Toast (Triggered strictly from Merchant App) */}
        {realtimeBanner && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
            <div className="px-4 py-3 rounded-2xl bg-cyan-950/95 border border-cyan-400/40 text-cyan-200 text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2 ring-1 ring-cyan-400/30">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                <span>{realtimeBanner}</span>
              </div>
              <button 
                onClick={() => setRealtimeBanner(null)} 
                className="text-cyan-400/70 hover:text-cyan-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TOP CUSTOMER SWITCHER BAR (Dropdown to view Elena Rostova or other members) */}
        <div className="px-5 pt-3 pb-1 z-30 relative">
          <div className="flex items-center justify-between p-1.5 px-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-sm">
            <button
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="flex items-center gap-2 text-left cursor-pointer flex-1 group"
              title="Click to switch member pass"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center font-bold text-[11px] text-black shadow-xs">
                {customerName.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {customerName}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-mono">
                  <span>ID: {memberId}</span>
                  {selectedMemberId === "88-849204" && (
                    <span className="text-amber-400 font-bold bg-amber-400/10 px-1 rounded-sm text-[9px]">
                      Merchant Target
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Realtime Live Status Pulse */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              <span 
                className={`w-2 h-2 rounded-full ${
                  realtimeStatus === "connected"
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" 
                    : "bg-amber-400 animate-pulse"
                }`}
              />
              <span className="font-mono text-[9px] text-white/50 uppercase tracking-wider hidden sm:inline">
                Realtime
              </span>
            </div>
          </div>

          {/* Customer Switcher Dropdown Modal */}
          {isSwitcherOpen && (
            <div 
              className="absolute left-5 right-5 top-12 z-50 bg-[#0d1527] border border-white/20 rounded-2xl shadow-2xl p-2.5 space-y-1.5 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-2 py-1 flex items-center justify-between">
                <span>Select Scanned Member</span>
                <span className="text-cyan-400 font-mono">Supabase Realtime</span>
              </div>

              {PRESET_CUSTOMERS.map((preset) => {
                const isSelected = preset.member_id === selectedMemberId;
                return (
                  <button
                    key={preset.member_id}
                    onClick={() => handleSelectCustomer(preset)}
                    className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200' 
                        : 'hover:bg-white/[0.05] text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-cyan-400 text-black' : 'bg-white/10 text-white/70'
                      }`}>
                        {preset.customer_name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{preset.customer_name}</span>
                          {preset.member_id === "88-849204" && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1 py-0.2 rounded-full font-mono">
                              POS Target
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/40 font-mono">
                          ID: {preset.member_id} • {preset.current_stamps}/7 Stamps
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-cyan-400 stroke-[3]" />
                    )}
                  </button>
                );
              })}

              {/* Custom Member ID Input */}
              <form onSubmit={handleCustomIdSubmit} className="pt-1 border-t border-white/10 flex items-center gap-1.5">
                <input
                  type="text"
                  value={customIdInput}
                  onChange={(e) => setCustomIdInput(e.target.value)}
                  placeholder="Custom Member ID (e.g. 88-849204)..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 font-mono"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Load
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Merchant Branding Header */}
        <section className="px-5 pt-3 pb-3 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center p-2.5 shadow-lg shadow-cyan-500/20 border border-cyan-300/30">
                <div className="w-4 h-8 bg-white rounded-t-sm rounded-b-md relative flex justify-center shadow-sm">
                  <div className="w-2 h-1.5 bg-white -top-1 absolute rounded-xs" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-[#090e1a]">
                <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-base tracking-tight text-white">{tenantName}</h1>
                <CheckCircle2 className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
              </div>
              <p className="text-xs text-white/50 truncate max-w-[190px]">{tenantLocation}</p>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-600/10 border border-amber-400/40 text-amber-300 flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] font-bold tracking-wider uppercase">{tier}</span>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className="px-5 pb-3 z-10">
          <div className="grid grid-cols-3 p-1 bg-white/[0.04] border border-white/10 rounded-2xl backdrop-blur-md">
            {[
              { id: "pass", label: "Digital Punch Pass" },
              { id: "history", label: "History" },
              { id: "benefits", label: "Benefits" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-cyan-500/20 to-sky-500/20 text-cyan-300 border border-cyan-400/30 shadow-md"
                    : "text-white/60 hover:text-white/90"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="px-5 flex-1 z-10 space-y-4">
          {activeTab === "pass" && (
            <>
              {/* Glassmorphism Digital Stamp Card */}
              <div className="relative rounded-3xl p-5 bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-transparent border border-white/15 backdrop-blur-2xl shadow-2xl">
                <div className="flex items-start justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">
                      Member Stamp Pass
                    </span>
                    <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">{customerName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-cyan-300 font-mono font-semibold">ID: {memberId}</span>
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-emerald-400 font-medium">Active Pass</span>
                    </div>
                  </div>
                  
                  {/* Dynamic TOTP QR Button */}
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all border border-white/15 flex flex-col items-center justify-center gap-0.5 group shadow-md cursor-pointer"
                    title={`Open Live TOTP QR Pass for ${customerName}`}
                  >
                    <QrCode className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold tracking-tight text-white/70">QR</span>
                  </button>
                </div>

                {/* Progress Bar (Strictly Read-Only) */}
                <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-white/5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-1.5 font-medium text-white/90">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {isRewardUnlocked ? (
                        <span className="text-emerald-400 font-bold">Reward Ready to Redeem!</span>
                      ) : (
                        <span>
                          <strong className="text-white">
                            {stampsRemaining === 1 ? "1 more stamp" : `${stampsRemaining} more stamps`}
                          </strong>{" "}
                          to Free Coffee
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-cyan-400 font-semibold bg-cyan-400/10 px-2 py-0.5 rounded-full text-[11px] border border-cyan-400/20">
                      {currentStamps}/{totalStamps} Stamps
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 shadow-sm shadow-cyan-400/50 transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 3x3 Stamp Grid (STRICTLY READ-ONLY: Updates only via Merchant App in Supabase) */}
                <div className="mt-4 grid grid-cols-3 gap-3 select-none">
                  {[1, 2, 3, 4, 5, 6].map((num) => {
                    const isStamped = num <= currentStamps;
                    return (
                      <div
                        key={num}
                        className={`aspect-square rounded-2xl border flex flex-col items-center justify-center relative shadow-lg transition-all ${
                          isStamped
                            ? "bg-gradient-to-br from-cyan-900/30 to-[#0e1f33] border-cyan-500/30"
                            : "bg-white/[0.02] border-white/10 opacity-60"
                        }`}
                      >
                        {isStamped && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-cyan-300 stroke-[3]" />
                          </span>
                        )}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                            isStamped
                              ? "bg-gradient-to-tr from-cyan-500 to-sky-400 shadow-cyan-500/40 text-white"
                              : "border border-white/20 text-white/40"
                          }`}
                        >
                          <Coffee className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[10px] font-mono font-medium mt-1.5 ${
                            isStamped ? "text-cyan-300" : "text-white/40"
                          }`}
                        >
                          #{num}
                        </span>
                      </div>
                    );
                  })}

                  {/* 7th Free Reward Slot (Strictly Read-Only) */}
                  <div
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative shadow-lg transition-all ${
                      currentStamps >= 7
                        ? "bg-gradient-to-b from-amber-500/30 to-yellow-600/20 border-2 border-amber-300 shadow-amber-400/30 ring-2 ring-amber-400/40"
                        : "bg-gradient-to-b from-amber-500/20 to-yellow-900/30 border-2 border-amber-400 animate-pulse"
                    }`}
                  >
                    <span className="absolute -top-2.5 bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md">
                      FREE
                    </span>
                    <span className="text-[9px] font-bold text-amber-300 mb-1 flex items-center gap-0.5">
                      ★ REWARD
                    </span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-400/40">
                      <Gift className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-[10px] font-black tracking-tight text-amber-300 mt-1">
                      7TH FREE
                    </span>
                  </div>

                  {/* Bonus Slots 8 & 9 (Strictly Read-Only) */}
                  {[8, 9].map((bonus) => {
                    const isBonusStamped = bonus <= currentStamps;
                    return (
                      <div
                        key={bonus}
                        className={`aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all ${
                          isBonusStamped
                            ? "bg-gradient-to-br from-cyan-900/20 to-[#0e1f33] border-cyan-500/40 opacity-90"
                            : "bg-white/[0.02] border-dashed border-white/20 opacity-50"
                        }`}
                      >
                        <span className="text-[9px] font-mono text-white/40 absolute top-1.5 right-2">+★</span>
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-xs font-mono text-white/40">
                          {bonus}
                        </div>
                        <span className="text-[9px] font-semibold text-white/30 uppercase mt-1">Bonus</span>
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    {rewardTitle}
                  </span>
                  <span className="text-white/40 font-mono">
                    {liveCard?.total_completed_cycles ?? 2} Claimed
                  </span>
                </div>
              </div>

              {/* Gold Tier Perk Active */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between hover:bg-white/[0.06] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{tier} Perk Active</h4>
                    <p className="text-[11px] text-white/50">Free oat/almond milk & signature vanilla bean syrup</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>

              {/* Mobile Wallet Integrations */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button 
                  onClick={() => alert(`${customerName}'s Pass (${memberId}) added to Apple Wallet`)}
                  className="py-2.5 px-3 rounded-2xl bg-black border border-white/20 hover:border-white/40 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <span className="text-sm font-serif font-black text-white"></span>
                  <span className="text-xs font-semibold text-white">Apple Wallet</span>
                </button>
                <button 
                  onClick={() => alert(`${customerName}'s Pass (${memberId}) saved to Google Wallet`)}
                  className="py-2.5 px-3 rounded-2xl bg-white/[0.05] border border-white/15 hover:border-white/30 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <span className="text-xs font-bold bg-gradient-to-r from-blue-400 via-red-400 to-yellow-400 bg-clip-text text-transparent">
                    G
                  </span>
                  <span className="text-xs font-semibold text-white">Google Wallet</span>
                </button>
              </div>
            </>
          )}

          {activeTab === "history" && (
            <div className="space-y-2.5 text-xs">
              <div className="text-white/40 font-mono text-[11px] px-1 flex items-center justify-between">
                <span>History for {customerName}</span>
                <span className="text-cyan-400 font-semibold">{liveStampsHistory.length} records</span>
              </div>
              {liveStampsHistory.map((h: any, idx) => (
                <div key={h.id || idx} className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs">
                      #{h.slot_number}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{h.item_name}</div>
                      <div className="text-[11px] text-white/50">{h.location} • {new Date(h.created_at).toLocaleDateString() === 'Invalid Date' ? h.created_at : new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    Verified
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "benefits" && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{tier} Privileges</span>
                </div>
                <p className="text-white/60 leading-relaxed">
                  Earn stamps towards free handcrafted coffee. After every 7 stamps, enjoy any 12oz beverage or pour-over on us.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="font-semibold text-white">Tier Benefits:</div>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Free oat & almond milk upgrade on all espresso drinks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Complimentary signature vanilla bean syrup</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>10% discount on whole-bean coffee bags</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Complimentary birthday beverage voucher</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </main>

        {/* Sticky Bottom CTA: Strictly Opens the Pass QR Code */}
        <div className="sticky bottom-0 p-5 z-20 bg-gradient-to-t from-[#090e1a] via-[#090e1a]/95 to-transparent">
          <button
            onClick={() => setShowQRModal(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 hover:from-cyan-300 hover:to-sky-400 text-black font-extrabold text-sm tracking-wide shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-black animate-ping" />
            <span>
              {isRewardUnlocked ? "Reward Ready • Show Pass to Redeem" : `Show Member Pass (${customerName.split(" ")[0]})`}
            </span>
          </button>
        </div>

        {/* Dynamic TOTP QR Code Fullscreen Glassmorphism Modal */}
        {showQRModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col justify-end p-5 transition-all animate-in fade-in duration-200"
            onClick={() => setShowQRModal(false)}
          >
            <div 
              className="relative bg-[#0d1527] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 max-w-[400px] mx-auto w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 cursor-pointer"
                title="Close pass"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> High-Security TOTP QR Pass
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{customerName}</h3>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className="text-xs text-cyan-300 font-mono font-semibold">ID: {memberId}</span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-emerald-400 font-mono">Present to Merchant</span>
                </div>
              </div>

              {/* Dynamic SVG QR Matrix with Centered Bottle Watermark */}
              <div className="bg-white p-4 rounded-2xl mx-auto w-52 h-52 flex flex-col items-center justify-center relative shadow-2xl">
                <svg
                  className="w-full h-full select-none"
                  viewBox="0 0 21 21"
                  shapeRendering="crispEdges"
                >
                  {qrGrid.map((row, rIdx) =>
                    row.map((isDark, cIdx) =>
                      isDark ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx}
                          y={rIdx}
                          width="1"
                          height="1"
                          fill="#070b13"
                        />
                      ) : null
                    )
                  )}
                </svg>

                {/* Central Merchant Badge */}
                <div className="absolute inset-0 m-auto w-8 h-8 rounded-lg bg-sky-500 border-2 border-white flex items-center justify-center shadow-md pointer-events-none">
                  <div className="w-2.5 h-5 bg-white rounded-t-xs rounded-b-sm relative flex justify-center">
                    <div className="w-1.5 h-1 bg-white -top-0.5 absolute rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* 30-Second TOTP Auto-Refresh Countdown Bar */}
              <div className="bg-white/[0.04] p-3 rounded-2xl border border-white/10 text-center space-y-1.5">
                <div className="flex items-center justify-between text-xs px-2 font-mono">
                  <span className="text-white/50">TOTP Token</span>
                  <span className="text-cyan-400 font-bold tracking-widest text-sm">{totpToken}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(qrCountdown / 30) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/40 pt-1 px-1">
                  <div className="flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 text-cyan-400 ${qrCountdown <= 3 ? "animate-spin" : ""}`} />
                    <span>Auto-rotates in {qrCountdown}s</span>
                  </div>
                  <button 
                    onClick={copyPayloadToClipboard}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
                    title="Copy Payload JSON"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedPayloadToast ? "Copied!" : "Payload"}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowQRModal(false)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-semibold text-white/80 transition-colors cursor-pointer"
              >
                Close Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
