// Ensure window.fetch has both getter and setter so that third-party polyfills or environment scripts
// can assign to fetch without throwing "TypeError: Cannot set property fetch of #<Window> which has only a getter"
try {
  let currentFetch = typeof window !== 'undefined' ? window.fetch : undefined;
  const desc = {
    configurable: true,
    enumerable: true,
    get() {
      return currentFetch;
    },
    set(fn: typeof window.fetch) {
      currentFetch = fn;
    }
  };

  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, 'fetch', desc);
    } catch (_) {}
    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', desc);
      } catch (_) {}
    }
  }

  if (typeof globalThis !== 'undefined') {
    try {
      Object.defineProperty(globalThis, 'fetch', desc);
    } catch (_) {}
  }
} catch (_) {}

export {};
