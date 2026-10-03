import { AlertTriangle } from "lucide-react";
import { AuthGate } from "./components/AuthGate";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Shell } from "./components/Shell";
import { configErrors } from "./lib/env";

export default function App() {
  if (configErrors.length > 0) {
    return (
      <Shell icon={<AlertTriangle className="w-5 h-5 text-black" />} title="App is not configured">
        <ul className="text-xs text-red-200 list-disc pl-4 space-y-1">
          {configErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Shell>
    );
  }
  return (
    <ErrorBoundary>
      <AuthGate />
    </ErrorBoundary>
  );
}
