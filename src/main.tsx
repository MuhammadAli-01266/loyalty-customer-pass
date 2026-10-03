// Prevent "Cannot set property fetch of #<Window> which has only a getter"
// when environment or extension scripts assign window.fetch
try {
  const descriptor = Object.getOwnPropertyDescriptor(window, "fetch");
  if (!descriptor || descriptor.configurable) {
    let currentFetch = window.fetch ? window.fetch.bind(window) : undefined;
    Object.defineProperty(window, "fetch", {
      get: () => currentFetch,
      set: (fn: typeof fetch) => {
        currentFetch = fn;
      },
      configurable: true,
      enumerable: true,
    });
  }
} catch {
  // Ignore in environments without window or non-configurable descriptor
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// In development, clear any stale service workers from old prototype builds.
// In production, register the offline app shell. Supabase requests are never cached.
if ("serviceWorker" in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });
  } else if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[pass] SW registration failed", err));
    });
  }
}

