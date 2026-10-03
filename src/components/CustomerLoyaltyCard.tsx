'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Coffee, 
  Sparkles, 
  QrCode, 
  X, 
  RotateCw, 
  Check, 
  Gift, 
  Award, 
  Smartphone, 
  Copy, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Flame, 
  History,
  Store,
  Share2,
  Crown,
  Volume2,
  VolumeX,
  Maximize2,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  ScanLine
} from 'lucide-react';

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  location: string;
  tagline: string;
  primaryColor: string; // e.g. '#00A3E0'
  accentColor: string;
  logoType: 'blue-bottle' | 'bakery' | 'matcha' | 'custom';
  rewardTitle: string;
  rewardDescription: string;
  totalRequiredStamps: number; // 7th is the milestone
  tierName: string;
  tierColor: string;
}

export interface CustomerData {
  id: string;
  name: string;
  membershipId: string;
  currentStamps: number;
  totalCompletedCycles: number;
  memberSince: string;
  lastVisit: string;
  tier: string;
  points: number;
}

export interface StampHistoryItem {
  id: string;
  slotNumber: number;
  timestamp: string;
  location: string;
  item: string;
  cashier: string;
}

const PRESET_TENANTS: TenantConfig[] = [
  {
    id: 't-bluebottle',
    name: 'Blue Bottle Coffee',
    slug: 'blue-bottle',
    location: 'Hayes Valley · 315 Linden St, San Francisco',
    tagline: 'Fresh roasted single-origin espresso & pour-overs',
    primaryColor: '#00A3E0', // Signature Blue Bottle cyan
    accentColor: '#38BDF8',
    logoType: 'blue-bottle',
    rewardTitle: 'Free Handcrafted Coffee',
    rewardDescription: 'Any 12oz beverage, single-origin pour-over, or cold brew',
    totalRequiredStamps: 7,
    tierName: 'Gold Brew Club',
    tierColor: '#F59E0B'
  },
  {
    id: 't-artisanbakery',
    name: 'Maison Du Levain',
    slug: 'maison-levain',
    location: 'SoHo · 112 Prince St, New York',
    tagline: 'Artisanal wild-yeast sourdough & viennoiserie',
    primaryColor: '#D97706',
    accentColor: '#FBBF24',
    logoType: 'bakery',
    rewardTitle: 'Artisan Pastry & Loaf',
    rewardDescription: 'Any fresh artisan sourdough loaf or specialty croissant',
    totalRequiredStamps: 7,
    tierName: 'Patisserie VIP',
    tierColor: '#FBBF24'
  },
  {
    id: 't-matchaclub',
    name: 'Komorebi Matcha Bar',
    slug: 'komorebi-matcha',
    location: 'Omotesando · Shibuya-ku, Tokyo',
    tagline: 'Ceremonial stone-ground Uji single-estate tea',
    primaryColor: '#059669',
    accentColor: '#34D399',
    logoType: 'matcha',
    rewardTitle: 'Ceremonial Matcha Latte',
    rewardDescription: 'Single-estate ceremonial grade matcha with oat milk',
    totalRequiredStamps: 7,
    tierName: 'Tea Master Circle',
    tierColor: '#34D399'
  }
];

// Minimalist Iconic Blue Bottle Vector Logo
const BlueBottleSvg = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 140" 
    fill="currentColor" 
    className={className}
    aria-label="Blue Bottle Coffee Logo"
  >
    <rect x="38" y="4" width="24" height="8" rx="2" fill="currentColor" />
    <path d="M40 12 H60 V34 L72 50 H28 L40 34 Z" fill="currentColor" />
    <path 
      d="M26 48 C24 54 22 66 22 84 C22 116 26 136 34 136 H66 C74 136 78 116 78 84 C78 66 76 54 74 48 Z" 
      fill="currentColor" 
    />
  </svg>
);

interface CustomerLoyaltyCardProps {
  deviceMode?: 'iphone' | 'android' | 'fullscreen';
  onOpenBackendDrawer?: () => void;
}

export default function CustomerLoyaltyCard({ 
  deviceMode: externalDeviceMode,
  onOpenBackendDrawer
}: CustomerLoyaltyCardProps) {
  // Device Preview Frame State
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'android' | 'fullscreen'>(
    externalDeviceMode || 'iphone'
  );

  useEffect(() => {
    if (externalDeviceMode) setDeviceFrame(externalDeviceMode);
  }, [externalDeviceMode]);

  // Tenant Customization State
  const [tenantIndex, setTenantIndex] = useState<number>(0);
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>('#00A3E0');
  const [customShopTitle, setCustomShopTitle] = useState<string>('Blue Bottle Coffee');
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);

  const tenant = useMemo(() => {
    const base = PRESET_TENANTS[tenantIndex];
    if (tenantIndex === 0) {
      return {
        ...base,
        name: customShopTitle,
        primaryColor: customPrimaryColor,
        accentColor: customPrimaryColor
      };
    }
    return base;
  }, [tenantIndex, customShopTitle, customPrimaryColor]);

  // Customer Data State - Initialized to 6 stamps to test the 6/7 -> 7/7 transition easily!
  const [customer, setCustomer] = useState<CustomerData>({
    id: 'cust-902',
    name: 'Alex Morgan',
    membershipId: 'BB-849204',
    currentStamps: 6, // 6 out of 7 stamps initially!
    totalCompletedCycles: 2,
    memberSince: 'Oct 2024',
    lastVisit: 'Today, 9:42 AM',
    tier: 'Gold Brew Club',
    points: 420
  });

  // Stamp History Log
  const [history, setHistory] = useState<StampHistoryItem[]>([
    { id: 'h-6', slotNumber: 6, timestamp: 'Today, 9:42 AM', location: 'Hayes Valley', item: '1x Bella Donovan Pour-over', cashier: 'Sam T.' },
    { id: 'h-5', slotNumber: 5, timestamp: 'Yesterday, 8:15 AM', location: 'Hayes Valley', item: '1x Cold Brew with Oat', cashier: 'Mia L.' },
    { id: 'h-4', slotNumber: 4, timestamp: 'Sep 27, 2:30 PM', location: 'Hayes Valley', item: '1x Gibraltar Espresso', cashier: 'Sam T.' },
    { id: 'h-3', slotNumber: 3, timestamp: 'Sep 25, 9:05 AM', location: 'Bryant Park', item: '1x Hayes Valley Espresso', cashier: 'David K.' },
    { id: 'h-2', slotNumber: 2, timestamp: 'Sep 22, 10:12 AM', location: 'Hayes Valley', item: '1x New Orleans Iced Coffee', cashier: 'Elena R.' },
    { id: 'h-1', slotNumber: 1, timestamp: 'Sep 19, 8:45 AM', location: 'Hayes Valley', item: '1x Single-Origin Macchiato', cashier: 'Sam T.' }
  ]);

  // QR Modal & 30-Second TOTP State
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrToken, setQrToken] = useState<string>('TOTP-BB-8924-X4F1');
  const [qrCountdown, setQrCountdown] = useState<number>(30);
  const [totpCycleCount, setTotpCycleCount] = useState<number>(1);

  // Sound Feedback Toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Stamp Animation & Toast States
  const [latestStampedIndex, setLatestStampedIndex] = useState<number | null>(null);
  const [isRewardCelebrationOpen, setIsRewardCelebrationOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'card' | 'history' | 'perks'>('card');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    title: string;
    message: string;
  } | null>(null);

  // Web Audio API Synthesizer (Chime & Audio Feedback)
  const playSubtleChime = (isFullReward = false) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (isFullReward) {
        // Triumphant 4-note celebration chime chord (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.55);
        });
      } else {
        // Subtle, elegant coffee shop stamp chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.09); // A5
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  // Confetti Animation over Card
  const fireConfetti = (isReward = false) => {
    try {
      if (isReward) {
        confetti({
          particleCount: 110,
          spread: 85,
          origin: { y: 0.55 },
          colors: [tenant.primaryColor, '#F59E0B', '#10B981', '#38BDF8', '#FFFFFF']
        });
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 60,
            origin: { x: 0.1, y: 0.65 },
            colors: [tenant.primaryColor, '#F59E0B']
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 60,
            origin: { x: 0.9, y: 0.65 },
            colors: ['#F59E0B', '#FFFFFF']
          });
        }, 220);
      } else {
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.5 },
          colors: [tenant.primaryColor, '#F59E0B', '#38BDF8', '#FFFFFF']
        });
      }
    } catch {
      // Canvas fallback
    }
  };

  // 30-Second TOTP Auto-Rotation Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isQrModalOpen) {
      timer = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            // Generate a fresh TOTP code every 30 seconds
            const randA = Math.random().toString(36).substring(2, 6).toUpperCase();
            const randB = Math.random().toString(36).substring(2, 6).toUpperCase();
            const prefix = tenant.name.split(' ')[0].substring(0, 3).toUpperCase();
            setQrToken(`TOTP-${prefix}-${randA}-${randB}`);
            setTotpCycleCount((c) => c + 1);
            playSubtleChime(false);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setQrCountdown(30);
    }
    return () => clearInterval(timer);
  }, [isQrModalOpen, tenant.name]);

  // Push Notification Dispatcher
  const showPushNotification = (title: string, message: string) => {
    const notifId = 'notif-' + Date.now();
    setActiveNotification({ id: notifId, title, message });
    setTimeout(() => {
      setActiveNotification((curr) => (curr?.id === notifId ? null : curr));
    }, 4000);
  };

  // =========================================================================
  // CORE SIMULATION LOGIC: "Simulate Scan" Handler
  // =========================================================================
  const handleSimulateScan = () => {
    const prevStamps = customer.currentStamps;
    const nextStamps = prevStamps >= 7 ? 1 : prevStamps + 1; // Cycle to next or increment
    const isNowFullReward = nextStamps === 7;

    setLatestStampedIndex(nextStamps);

    // 1. Play subtle chime sound
    playSubtleChime(isNowFullReward);

    // 2. Display confetti animation over card
    fireConfetti(isNowFullReward);

    // 3. Update customer stamp count
    setCustomer((prev) => ({
      ...prev,
      currentStamps: nextStamps,
      totalCompletedCycles: isNowFullReward ? prev.totalCompletedCycles + 1 : prev.totalCompletedCycles,
      lastVisit: 'Just now'
    }));

    // Add to history
    setHistory((prev) => [
      {
        id: 'h-' + Date.now(),
        slotNumber: nextStamps,
        timestamp: 'Just now',
        location: 'Hayes Valley',
        item: isNowFullReward 
          ? 'Single-Origin Pour-over · 7th Free Reward Unlocked! 🎉' 
          : `Single-Origin Brew (+1 Stamp #${nextStamps})`,
        cashier: 'Sam T.'
      },
      ...prev
    ]);

    // Show simulated notification
    if (isNowFullReward) {
      showPushNotification(
        `🎉 ${tenant.name}`,
        `7/7 Stamps Reached! Your Free Handcrafted Coffee is unlocked. Tap 'Redeem Free Coffee Reward' to claim.`
      );
      setIsRewardCelebrationOpen(true);
    } else {
      const remaining = 7 - nextStamps;
      showPushNotification(
        `☕ ${tenant.name}`,
        `Stamp added! (${nextStamps}/7 Stamps). Only ${remaining} more stamp${remaining === 1 ? '' : 's'} to Free Coffee!`
      );
    }

    setTimeout(() => setLatestStampedIndex(null), 1200);
  };

  // Redeem Reward Action
  const handleRedeemReward = () => {
    playSubtleChime(true);
    fireConfetti(true);
    setToastMessage('Free Handcrafted Coffee Redeemed! 🎉 Enjoy your drink.');
    setTimeout(() => setToastMessage(null), 3000);

    // Reset stamps for next cycle and record cycle
    setCustomer((prev) => ({
      ...prev,
      currentStamps: 0,
      totalCompletedCycles: prev.totalCompletedCycles,
      lastVisit: 'Just now'
    }));

    setIsRewardCelebrationOpen(false);
  };

  // Reset helper
  const handleResetCard = () => {
    playSubtleChime(false);
    setCustomer((prev) => ({
      ...prev,
      currentStamps: 0,
      lastVisit: 'Just now'
    }));
    setToastMessage('Stamp card reset to 0/7 stamps.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Jump to 6 helper for rapid testing
  const handleSetToSix = () => {
    playSubtleChime(false);
    setCustomer((prev) => ({
      ...prev,
      currentStamps: 6
    }));
    setToastMessage('Card primed to 6/7 stamps (1 more to Free Coffee)!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // SVG QR Code Pattern Generator (21x21 matrix)
  const qrGrid = useMemo(() => {
    const size = 21;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    let seed = 0;
    for (let i = 0; i < qrToken.length; i++) seed += qrToken.charCodeAt(i) * (i + 1);

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
        } else if (r >= 8 && r <= 12 && c >= 8 && c <= 12) {
          grid[r][c] = false;
        } else {
          seed = (seed * 9301 + 49297) % 233280;
          grid[r][c] = seed % 3 === 0;
        }
      }
    }
    return grid;
  }, [qrToken]);

  const isFullReward = customer.currentStamps >= 7;
  const stampsRemaining = Math.max(0, 7 - customer.currentStamps);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-4 px-2 sm:px-6 relative select-none">
      
      {/* FLOATING CONTROL BAR: Fast Testing & Simulator Affordance */}
      <header aria-label="Controls" className="w-full max-w-md sm:max-w-xl mb-4 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg z-30">
        <div className="flex items-center gap-2">
          {/* Tenant Preset / Customizer */}
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700/60 cursor-pointer"
            title="Switch Brand Preset"
          >
            <Store className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden xs:inline">{tenant.name.split(' ')[0]}</span>
            <span className="xs:hidden">Brand</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isCustomizing ? 'rotate-180' : ''}`} />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              soundEnabled 
                ? 'bg-slate-800 border-slate-700 text-sky-400' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Haptic Audio Enabled' : 'Haptic Audio Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* PROMINENT TOP SIMULATE SCAN TRIGGER */}
        <button
          onClick={handleSimulateScan}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer ring-1 ring-emerald-300"
          title="Simulate Scan: Increment stamp count, play chime & trigger confetti"
        >
          <ScanLine className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Simulate Scan</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950/20 text-[10px] font-mono">
            {customer.currentStamps}/7
          </span>
        </button>

        {/* Device Viewport Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setDeviceFrame('iphone')}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              deviceFrame === 'iphone' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="iPhone 16 Pro"
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">iOS</span>
          </button>
          <button
            onClick={() => setDeviceFrame('android')}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              deviceFrame === 'android' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Android Pixel"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Android</span>
          </button>
          <button
            onClick={() => setDeviceFrame('fullscreen')}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              deviceFrame === 'fullscreen' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Full Screen PWA"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        {/* Backend Drawer button if present */}
        {onOpenBackendDrawer && (
          <button
            onClick={onOpenBackendDrawer}
            className="hidden md:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium items-center gap-1 cursor-pointer"
            title="Supabase Schema & RLS"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SQL</span>
          </button>
        )}
      </header>

      {/* DROPDOWN: TENANT CUSTOMIZATION DRAWER */}
      {isCustomizing && (
        <div className="w-full max-w-md sm:max-w-xl mb-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-4 duration-200 z-30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
              Tenant & Brand Settings
            </span>
            <button 
              onClick={() => setIsCustomizing(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PRESET_TENANTS.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => {
                  setTenantIndex(idx);
                  if (idx === 0) {
                    setCustomPrimaryColor('#00A3E0');
                    setCustomShopTitle('Blue Bottle Coffee');
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  tenantIndex === idx 
                    ? 'bg-slate-800 border-sky-500 shadow-md ring-1 ring-sky-500/50' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.primaryColor }} />
                  <span className="text-[11px] font-bold text-white truncate">{t.name.split(' ')[0]}</span>
                </div>
                <div className="text-[9px] text-slate-400 truncate">{t.tierName}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* THE DEVICE VIEWPORT CONTAINER */}
      {/* ========================================================================= */}
      <div 
        className={`w-full transition-all duration-300 relative ${
          deviceFrame === 'iphone'
            ? 'max-w-[400px] rounded-[52px] border-[10px] border-slate-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.85)] bg-slate-950 overflow-hidden ring-1 ring-slate-700/50'
            : deviceFrame === 'android'
            ? 'max-w-[395px] rounded-[36px] border-[8px] border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.8)] bg-slate-950 overflow-hidden ring-1 ring-slate-700/50'
            : 'max-w-md rounded-3xl border border-slate-800 shadow-2xl bg-slate-950 overflow-hidden'
        }`}
      >
        {/* Hardware buttons on iPhone */}
        {deviceFrame === 'iphone' && (
          <>
            <div className="absolute -left-[13px] top-[115px] w-[3px] h-[28px] bg-slate-700 rounded-l-sm" />
            <div className="absolute -left-[13px] top-[155px] w-[3px] h-[48px] bg-slate-700 rounded-l-sm" />
            <div className="absolute -left-[13px] top-[215px] w-[3px] h-[48px] bg-slate-700 rounded-l-sm" />
            <div className="absolute -right-[13px] top-[170px] w-[3px] h-[65px] bg-slate-700 rounded-r-sm" />
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STATUS BAR & DYNAMIC ISLAND */}
        {/* ------------------------------------------------------------- */}
        {deviceFrame === 'iphone' && (
          <div className="relative pt-3 pb-1 px-7 flex items-center justify-between bg-slate-950 text-slate-300 text-[12px] font-semibold tracking-tight select-none z-40">
            <span>9:41</span>
            
            {/* Dynamic Island */}
            <div 
              onClick={handleSimulateScan}
              className="h-[28px] px-3 bg-black rounded-full flex items-center justify-center gap-2 border border-slate-900 cursor-pointer shadow-inner hover:scale-105 transition-transform"
              title="Tap Dynamic Island to simulate cashier scan"
            >
              <div 
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: isFullReward ? '#10B981' : tenant.primaryColor }}
              />
              <span className="text-[10px] font-mono text-slate-300">
                {isFullReward ? 'Reward 7/7 Ready!' : `${customer.currentStamps}/7 Stamps`}
              </span>
              <div className="w-2 h-2 rounded-full bg-slate-800" />
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-[10px] font-mono">5G</span>
              <div className="w-5 h-2.5 border border-slate-400 rounded-xs p-0.5 flex items-center">
                <div className="w-full h-full bg-slate-100 rounded-2xs" />
              </div>
            </div>
          </div>
        )}

        {deviceFrame === 'android' && (
          <div className="pt-2 pb-1 px-6 flex items-center justify-between bg-slate-950 text-slate-400 text-[11px] font-mono select-none z-40">
            <span>12:00</span>
            <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[10px]">LTE</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* REAL-TIME SIMULATED PUSH NOTIFICATION */}
        {/* ------------------------------------------------------------- */}
        {activeNotification && (
          <div 
            onClick={() => setActiveNotification(null)}
            className="absolute top-12 left-3 right-3 z-50 animate-in slide-in-from-top-6 duration-300 cursor-pointer"
          >
            <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-start gap-3 ring-1 ring-white/10">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                {tenant.logoType === 'blue-bottle' ? (
                  <BlueBottleSvg className="w-5 h-5 text-white" />
                ) : (
                  <Coffee className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white truncate">{activeNotification.title}</span>
                  <span className="text-slate-400 text-[10px]">now</span>
                </div>
                <p className="text-[12px] text-slate-200 mt-0.5 leading-snug">
                  {activeNotification.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PWA HEADER */}
        {/* ------------------------------------------------------------- */}
        <div className="relative px-5 pt-3 pb-3 flex items-center justify-between border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
              style={{ 
                backgroundColor: tenant.primaryColor,
                boxShadow: `0 8px 16px -4px ${tenant.primaryColor}50`
              }}
            >
              {tenant.logoType === 'blue-bottle' && <BlueBottleSvg className="w-6 h-6 text-white" />}
              {tenant.logoType === 'bakery' && <Flame className="w-5 h-5 text-white" />}
              {tenant.logoType === 'matcha' && <Sparkles className="w-5 h-5 text-white" />}
              {tenant.logoType === 'custom' && <Coffee className="w-5 h-5 text-white" />}
            </div>

            <div className="min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight leading-none truncate">
                {tenant.name}
              </h1>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {tenant.location}
              </p>
            </div>
          </div>

          {/* Tier Badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shadow-xs shrink-0"
            style={{
              backgroundColor: `${tenant.tierColor}15`,
              borderColor: `${tenant.tierColor}40`,
              color: tenant.tierColor
            }}
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[95px]">{tenant.tierName}</span>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="px-5 pt-2 flex items-center gap-6 border-b border-slate-900 bg-slate-950 text-xs z-10">
          <button
            onClick={() => setActiveTab('card')}
            className={`pb-2.5 font-medium transition-colors relative cursor-pointer ${
              activeTab === 'card' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Digital Punch Pass
            {activeTab === 'card' && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: tenant.primaryColor }}
              />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 font-medium transition-colors relative cursor-pointer ${
              activeTab === 'history' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            History
            {activeTab === 'history' && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: tenant.primaryColor }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('perks')}
            className={`pb-2.5 font-medium transition-colors relative cursor-pointer ${
              activeTab === 'perks' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Benefits
            {activeTab === 'perks' && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: tenant.primaryColor }}
              />
            )}
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SCROLLABLE BODY */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[640px] overflow-y-auto scrollbar-none">
          
          {/* TAB 1: THE DIGITAL STAMP CARD */}
          {activeTab === 'card' && (
            <>
              {/* THE SLEEK PHYSICAL WALLET-STYLE DIGITAL PASS */}
              <div 
                className="relative rounded-[28px] p-5 shadow-2xl border overflow-hidden transition-all duration-300"
                style={{
                  backgroundColor: '#0A0F1D',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: `0 20px 45px -12px ${tenant.primaryColor}30`
                }}
              >
                {/* Hero Cafe Cover Ambient Glow Backdrop */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none bg-cover bg-center"
                  style={{ backgroundImage: `url('/src/assets/images/cafe_hero_banner_1790862653855.jpg')` }}
                />

                {/* Ambient Blur Halos */}
                <div 
                  className="absolute -top-20 -right-20 w-52 h-52 rounded-full blur-3xl opacity-25 pointer-events-none"
                  style={{ backgroundColor: tenant.primaryColor }}
                />
                <div 
                  className="absolute -bottom-20 -left-20 w-52 h-52 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ backgroundColor: tenant.accentColor }}
                />

                {/* Card Header Info with Existing "QR" Button */}
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                      Member Stamp Pass
                    </span>
                    <h2 className="text-white font-bold text-lg tracking-tight leading-tight">
                      {customer.name}
                    </h2>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      ID: {customer.membershipId}
                    </div>
                  </div>

                  {/* EXISTING "QR" BUTTON: Triggers Smooth Glassmorphism Overlay */}
                  <button
                    onClick={() => {
                      playSubtleChime(false);
                      setIsQrModalOpen(true);
                    }}
                    className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer group shadow-md"
                    title="Open Rotating QR Pass"
                  >
                    <div className="w-7 h-7 bg-white rounded-lg p-0.5 flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-slate-950" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-200 group-hover:text-white uppercase tracking-wider">
                      QR
                    </span>
                  </button>
                </div>

                {/* Progress Status Bar (To 7th Free Reward) */}
                <div className="relative z-10 my-3.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-200 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {isFullReward ? (
                        <strong className="text-emerald-400 font-bold">7/7 Stamps · Free Coffee Unlocked!</strong>
                      ) : (
                        <span>
                          <strong>{stampsRemaining === 1 ? '1 more stamp' : `${stampsRemaining} more stamps`}</strong> to Free Coffee
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-slate-300 font-bold tabular-nums text-[11px]">
                      {customer.currentStamps}/7 Stamps
                    </span>
                  </div>

                  {/* Progress Indicator */}
                  <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden p-0.5">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, (customer.currentStamps / 7) * 100)}%`,
                        backgroundColor: isFullReward ? '#10B981' : tenant.primaryColor
                      }}
                    />
                  </div>
                </div>

                {/* ========================================================= */}
                {/* VISUAL 3x3 DIGITAL STAMP CARD GRID */}
                {/* ========================================================= */}
                <div className="relative z-10 my-2">
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {Array.from({ length: 9 }).map((_, i) => {
                      const slotNumber = i + 1;
                      const isStamped = slotNumber <= customer.currentStamps;
                      const is7thSlot = slotNumber === 7; // The glowing 7th free reward slot!
                      const isJustStamped = slotNumber === latestStampedIndex;
                      const isNextTarget = slotNumber === customer.currentStamps + 1;

                      return (
                        <div
                          key={slotNumber}
                          onClick={() => {
                            setCustomer((prev) => ({ ...prev, currentStamps: slotNumber }));
                            playSubtleChime(slotNumber === 7);
                            fireConfetti(slotNumber === 7);
                          }}
                          className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer select-none ${
                            isJustStamped ? 'scale-110 shadow-2xl ring-2 ring-white' : 'hover:scale-[1.03]'
                          } ${
                            is7thSlot
                              ? isStamped
                                ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/10 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.4)]'
                                : 'bg-gradient-to-br from-amber-500/15 via-amber-950/30 to-slate-900 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse'
                              : isStamped
                              ? 'bg-slate-900/90 border border-slate-700/80 shadow-inner'
                              : isNextTarget
                              ? 'bg-slate-900/50 border border-dashed border-sky-400/60 shadow-xs'
                              : 'bg-slate-900/30 border border-slate-800/80'
                          }`}
                          style={{
                            borderColor: is7thSlot 
                              ? '#F59E0B' 
                              : isStamped 
                              ? tenant.primaryColor 
                              : undefined
                          }}
                        >
                          {/* 1. Stamped Active Coffee Cup */}
                          {isStamped ? (
                            <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-200">
                              <div 
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shadow-md"
                                style={{
                                  backgroundColor: is7thSlot ? '#F59E0B' : tenant.primaryColor,
                                  boxShadow: `0 4px 12px ${is7thSlot ? '#F59E0B60' : tenant.primaryColor + '60'}`
                                }}
                              >
                                {is7thSlot ? (
                                  <Gift className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                                ) : tenant.logoType === 'blue-bottle' ? (
                                  <BlueBottleSvg className="w-5 h-5 text-white" />
                                ) : (
                                  <Coffee className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <span className="text-[10px] font-mono mt-1 font-bold text-slate-300">
                                {is7thSlot ? 'FREE!' : `#${slotNumber}`}
                              </span>
                            </div>
                          ) : is7thSlot ? (
                            /* 2. THE GLOWING 7TH FREE REWARD SLOT */
                            <div className="flex flex-col items-center justify-center text-center p-1">
                              <div className="relative mb-0.5">
                                <div className="absolute inset-0 bg-amber-400/40 blur-md rounded-full -z-10" />
                                <Gift className="w-6 h-6 text-amber-400 animate-bounce duration-1000" />
                              </div>
                              <span className="text-[9px] font-extrabold text-amber-300 uppercase tracking-tight leading-none">
                                7th FREE
                              </span>
                              <span className="text-[8px] font-medium text-amber-200/90 mt-0.5 leading-none">
                                Reward
                              </span>

                              <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[8px] shadow-sm uppercase tracking-wider">
                                FREE
                              </div>
                            </div>
                          ) : (
                            /* 3. Empty Slot */
                            <div className="flex flex-col items-center justify-center text-slate-600">
                              <span className="font-mono text-sm font-semibold text-slate-500">
                                #{slotNumber}
                              </span>
                              <span className="text-[8px] uppercase tracking-wider text-slate-600 mt-0.5">
                                {slotNumber > 7 ? 'Bonus' : 'Stamp'}
                              </span>
                            </div>
                          )}

                          {slotNumber > 7 && !isStamped && (
                            <div className="absolute top-1 right-1 text-[8px] text-slate-600 font-mono">
                              +⭐
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: Reward terms */}
                <div className="relative z-10 mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate text-slate-300 font-medium">
                      {tenant.rewardTitle}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {customer.totalCompletedCycles} Claimed
                  </span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* MAIN REWARD STATE CTA: Smooth transition 6/7 -> 7/7 */}
              {/* ========================================================= */}
              <div className="pt-1">
                {isFullReward ? (
                  /* 7/7 STAMPS ACHIEVED: REDEEM FREE COFFEE REWARD */
                  <button
                    onClick={handleRedeemReward}
                    className="w-full py-4 px-5 rounded-2xl text-slate-950 font-extrabold text-sm flex items-center justify-between transition-all duration-300 active:scale-[0.98] shadow-xl cursor-pointer group bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 shadow-amber-500/30 animate-pulse ring-2 ring-amber-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center shadow-inner">
                        <Gift className="w-5 h-5 text-amber-400 animate-bounce" />
                      </div>
                      <div className="text-left">
                        <div className="leading-tight text-base font-black tracking-tight text-slate-950">
                          Redeem Free Coffee Reward
                        </div>
                        <div className="text-[11px] text-slate-800 font-semibold">
                          7/7 Completed · Tap to Claim at Counter
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-950 group-hover:translate-x-1.5 transition-transform" />
                  </button>
                ) : (
                  /* IN-PROGRESS CTA: "1 more stamp to Free Coffee" */
                  <button
                    onClick={() => {
                      playSubtleChime(false);
                      setIsQrModalOpen(true);
                    }}
                    className="w-full py-4 px-5 rounded-2xl text-white font-bold text-sm flex items-center justify-between transition-all duration-300 active:scale-[0.98] shadow-lg cursor-pointer group"
                    style={{
                      backgroundColor: tenant.primaryColor,
                      boxShadow: `0 12px 28px -6px ${tenant.primaryColor}60`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                        <QrCode className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                      </div>
                      <div className="text-left">
                        <div className="leading-tight font-bold text-sm">
                          {stampsRemaining === 1 ? '1 more stamp to Free Coffee' : `${stampsRemaining} more stamps to Free Coffee`}
                        </div>
                        <div className="text-[10px] text-white/80 font-normal">
                          Show In-Store QR Pass to Earn Stamp
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>

              {/* ========================================================= */}
              {/* REALTIME STAMP AWARDING SIMULATION CONTROLS */}
              {/* ========================================================= */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Realtime Stamp Awarding Simulation</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Interactive
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* The primary "Simulate Scan" button */}
                  <button
                    onClick={handleSimulateScan}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer border border-emerald-400/40"
                    title="Simulate Scan: Increments stamp count, plays chime sound, triggers confetti"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Simulate Scan</span>
                  </button>

                  {/* Quick Preset: 6/7 stamps */}
                  <button
                    onClick={handleSetToSix}
                    className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-700"
                    title="Set to 6/7 stamps to test 1-more-stamp scenario"
                  >
                    <span>Set to 6/7</span>
                  </button>

                  {/* Reset button */}
                  <button
                    onClick={handleResetCard}
                    className="py-2 px-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs flex items-center justify-center transition-colors cursor-pointer"
                    title="Reset card to 0/7 stamps"
                  >
                    <span>Reset (0)</span>
                  </button>
                </div>
              </div>

              {/* Activity footer bar */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Last Visit: <strong className="text-slate-300">{customer.lastVisit}</strong></span>
                </div>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="text-sky-400 hover:underline text-[11px] font-medium cursor-pointer"
                >
                  History Log
                </button>
              </div>
            </>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Stamp Audit Log</span>
                <span className="font-mono text-[11px]">Synced with Supabase</span>
              </div>

              <div className="space-y-2">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-mono font-bold text-xs"
                        style={{ backgroundColor: item.slotNumber === 7 ? '#F59E0B' : tenant.primaryColor }}
                      >
                        #{item.slotNumber}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{item.item}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{item.location}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.timestamp}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] text-slate-400">
                      <div>Cashier: {item.cashier}</div>
                      <div className="text-emerald-400 font-semibold flex items-center gap-0.5 justify-end">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PERKS */}
          {activeTab === 'perks' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>{tenant.tierName} Privileges</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Active Member
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[12px]">
                  As an official member of {tenant.name}, every 7th stamp automatically awards a complimentary handcrafted drink of any size.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  Member Perks Included
                </h3>
                <ul className="space-y-2.5 text-slate-300 text-[12px]">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Free alternative milks (Oat, Almond) on all handcrafted drinks.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>10% off whole-bean coffee bags and artisanal merchandise.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Birthday beverage voucher credited to your digital wallet.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Bottom hardware gesture bar */}
        {deviceFrame === 'iphone' && (
          <div className="py-2 flex justify-center bg-slate-950">
            <div className="w-32 h-1 bg-slate-700/80 rounded-full" />
          </div>
        )}
        {deviceFrame === 'android' && (
          <div className="py-2 flex justify-center bg-slate-950">
            <div className="w-20 h-1 bg-slate-700/60 rounded-full" />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LIVE QR CODE: SMOOTH GLASSMORPHISM OVERLAY WITH 30s TOTP ROTATION */}
      {/* ========================================================================= */}
      {isQrModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-slate-900/90 border border-white/10 rounded-[36px] p-6 shadow-2xl relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200 backdrop-blur-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              onClick={() => {
                playSubtleChime(false);
                setIsQrModalOpen(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close QR Pass"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Merchant Identity */}
            <div className="mb-3">
              <div 
                className="w-11 h-11 rounded-2xl mx-auto mb-2 flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                {tenant.logoType === 'blue-bottle' ? (
                  <BlueBottleSvg className="w-6 h-6 text-white" />
                ) : (
                  <Coffee className="w-6 h-6 text-white" />
                )}
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {tenant.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Present to cashier scanner at point of sale
              </p>
            </div>

            {/* DYNAMIC ROTATING QR CODE CONTAINER */}
            <div className="relative bg-white p-5 rounded-3xl shadow-2xl flex items-center justify-center my-1 select-none">
              {/* Laser Scanning Line */}
              <div className="absolute inset-x-5 top-5 h-0.5 bg-sky-400/80 shadow-[0_0_12px_#38bdf8] animate-pulse pointer-events-none" />

              <svg 
                className="w-56 h-56 select-none" 
                viewBox="0 0 21 21" 
                shapeRendering="crispEdges"
              >
                {qrGrid.map((row, rIdx) => 
                  row.map((isDark, cIdx) => (
                    isDark ? (
                      <rect 
                        key={`${rIdx}-${cIdx}`} 
                        x={cIdx} 
                        y={rIdx} 
                        width="1" 
                        height="1" 
                        fill="#000000" 
                      />
                    ) : null
                  ))
                )}
              </svg>

              {/* Merchant Watermark in QR Center */}
              <div 
                className="absolute inset-0 m-auto w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md border-2 border-white pointer-events-none"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                {tenant.logoType === 'blue-bottle' ? (
                  <BlueBottleSvg className="w-6 h-6 text-white" />
                ) : (
                  <Coffee className="w-6 h-6 text-white" />
                )}
              </div>
            </div>

            {/* TOTP Rotating Token & Copy Button */}
            <div className="mt-3 flex items-center gap-2">
              <span className="font-mono text-xs text-slate-300 font-bold tracking-wider">
                {qrToken}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrToken);
                  setToastMessage('TOTP Token Copied to Clipboard!');
                  setTimeout(() => setToastMessage(null), 2000);
                }}
                className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy TOTP Code"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 30-SECOND COUNTDOWN PROGRESS BAR (TOTP Auto-Refresh) */}
            <div className="w-full mt-4 space-y-1.5 px-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>30s TOTP Auto-Refresh</span>
                </span>
                <span className="text-emerald-400 font-bold tabular-nums">{qrCountdown}s</span>
              </div>

              {/* Live Smooth Depleting Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(qrCountdown / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Anti-Fraud Security Guarantee */}
            <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Time-based One-Time Password (Anti-Fraud)</span>
            </div>

            {/* IN-OVERLAY "SIMULATE SCAN" BUTTON */}
            <button
              onClick={() => {
                handleSimulateScan();
                setIsQrModalOpen(false);
              }}
              className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all active:scale-98 cursor-pointer shadow-lg flex items-center justify-center gap-2 border border-emerald-400/40"
            >
              <ScanLine className="w-4 h-4" />
              <span>Simulate Scan & Award Stamp</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7th FREE REWARD CELEBRATION MODAL */}
      {/* ========================================================================= */}
      {isRewardCelebrationOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in zoom-in-95 duration-200"
          onClick={() => setIsRewardCelebrationOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400/60 rounded-[36px] p-6 shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-20 h-20 rounded-full bg-amber-400/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <div className="absolute inset-0 bg-amber-400/30 blur-xl rounded-full" />
              <Gift className="w-10 h-10 text-amber-300 stroke-[2.5]" />
            </div>

            <span className="text-[11px] font-mono font-extrabold text-amber-400 uppercase tracking-widest block mb-1">
              7/7 STAMPS ACHIEVED!
            </span>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {tenant.rewardTitle}
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Congratulations Alex! You have completed your 7th stamp. Present your digital card at the counter to redeem your free handcrafted coffee.
            </p>

            <div className="my-5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between">
                <span>Reward Value:</span>
                <strong className="text-emerald-400 font-mono">100% Free</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Member ID:</span>
                <strong className="text-white font-mono">{customer.membershipId}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRedeemReward}
                className="flex-1 py-3.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-lg"
              >
                Redeem Free Coffee Reward
              </button>
              <button
                onClick={() => setIsRewardCelebrationOpen(false)}
                className="py-3.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Save for Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-2xl animate-in fade-in duration-200 border border-emerald-400/40">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* QUIET SUBTLE FOOTER */}
      <footer className="mt-4 text-center text-[11px] text-slate-500">
        <span>Customer Stamp Card · Live QR Generator & 30s TOTP Rotation · Interactive Simulation</span>
      </footer>
    </div>
  );
}
