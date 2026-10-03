import { useState, type FormEvent } from "react";
import { User } from "lucide-react";
import { api } from "../lib/api";
import { Shell } from "./Shell";

/** Shown once for new accounts. Stores see a short form only (e.g. "Maya K."). */
export function NameScreen({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 120);
    if (clean.length < 2 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateMyName(userId, clean);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell icon={<User className="w-5 h-5 text-white" />} title="What should we call you?" subtitle="Shown on your pass">
      <form onSubmit={save} className="space-y-3">
        <input
          autoFocus
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          aria-label="Full name"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60"
        />
        <p className="text-[10px] text-white/40">Stores only see your first name and last initial.</p>
        {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy || name.trim().length < 2}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-black font-extrabold text-sm cursor-pointer disabled:opacity-60"
        >
          {busy ? "Saving..." : "Continue"}
        </button>
      </form>
    </Shell>
  );
}
