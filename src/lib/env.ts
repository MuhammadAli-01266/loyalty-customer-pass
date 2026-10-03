/**
 * Unified Environment Variable Management & Fallback Resolver
 * Supports both Vite (VITE_) and Next.js (NEXT_PUBLIC_) conventions.
 * Includes sanitization against Markdown wrapping, trailing slashes, and quotes.
 */

// Default Fallback Supabase Credentials
const DEFAULT_SUPABASE_URL = 'https://uovotzsbepqufgcxewkt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_h1MmJxWUkjndrmHiPr4ogQ_ba94P';

/**
 * Safely extracts a clean HTTP/HTTPS URL from any raw environment variable string,
 * automatically stripping Markdown links like `[https://...](https://...)`, outer quotes, or spaces.
 */
export function sanitizeUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_SUPABASE_URL;
  }

  // Handle Markdown-style links [url](url)
  const match = rawUrl.match(/https?:\/\/[^\s)"'\]]+/i);
  if (match && match[0]) {
    // Strip trailing slash for consistency
    return match[0].trim().replace(/\/+$/, '');
  }

  const cleaned = rawUrl.trim().replace(/^["'`]|["'`]$/g, '').replace(/\/+$/, '');
  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  return DEFAULT_SUPABASE_URL;
}

/**
 * Cleans an API / Anon key by stripping outer quotes, brackets, and whitespace.
 */
export function sanitizeKey(rawKey: string | undefined | null): string {
  if (!rawKey || typeof rawKey !== 'string') {
    return DEFAULT_SUPABASE_ANON_KEY;
  }

  const cleaned = rawKey.trim().replace(/^["'`]|["'`]$/g, '');
  return cleaned || DEFAULT_SUPABASE_ANON_KEY;
}

/**
 * Reads an environment variable checking both VITE_ and NEXT_PUBLIC_ prefixes,
 * inspecting both Vite's `import.meta.env` and Node/SSR `process.env`.
 */
export function getEnvVar(keyBase: string): string | undefined {
  const viteKey = `VITE_${keyBase}`;
  const nextKey = `NEXT_PUBLIC_${keyBase}`;

  // 1. Check import.meta.env (Vite client build)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env[viteKey]) return import.meta.env[viteKey];
      if (import.meta.env[nextKey]) return import.meta.env[nextKey];
      if (import.meta.env[keyBase]) return import.meta.env[keyBase];
    }
  } catch (_) {
    // Ignore ReferenceErrors if import.meta is unavailable
  }

  // 2. Check process.env (Vercel / Node / SSR build)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[viteKey]) return process.env[viteKey];
      if (process.env[nextKey]) return process.env[nextKey];
      if (process.env[keyBase]) return process.env[keyBase];
    }
  } catch (_) {
    // Ignore ReferenceErrors
  }

  return undefined;
}

// Resolved & Sanitized Environment Values
export const SUPABASE_URL = sanitizeUrl(
  getEnvVar('SUPABASE_URL') || DEFAULT_SUPABASE_URL
);

export const SUPABASE_ANON_KEY = sanitizeKey(
  getEnvVar('SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY
);

// Auth Token Storage Key (Synced with multi-tenant architecture)
export const AUTH_STORAGE_KEY = 'loyalty_customer_pass_session_v1';

export const IS_PRODUCTION = 
  (typeof import.meta !== 'undefined' && import.meta.env?.PROD) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
