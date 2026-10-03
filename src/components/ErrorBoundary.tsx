import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Shell } from "./Shell";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[pass] render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Shell icon={<AlertTriangle className="w-5 h-5 text-black" />} title="Something went wrong">
        <p className="text-xs text-white/60">
          Your stamps are stored safely on the server. Reload to open your pass again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-black font-extrabold text-sm cursor-pointer"
        >
          Reload Pass
        </button>
      </Shell>
    );
  }
}
