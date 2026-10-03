import type { ReactNode } from "react";

/** Phone-width glass card used by the pre-pass screens (matches the pass styling). */
export function Shell({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070b13] text-white flex justify-center font-sans antialiased">
      <div className="w-full max-w-[420px] min-h-screen relative flex flex-col justify-center bg-[#090e1a] shadow-2xl overflow-hidden p-5">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 rounded-3xl p-5 bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-transparent border border-white/15 backdrop-blur-2xl shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-300/30">
              {icon}
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white">{title}</h1>
              {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
