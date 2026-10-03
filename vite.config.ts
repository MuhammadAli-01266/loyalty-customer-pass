import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uovotzsbepqufgcxewkt.supabase.co';
  const cleanUrl = rawUrl.match(/https?:\/\/[^\s)"'\]]+/i)?.[0]?.replace(/\/+$/, '') || 'https://uovotzsbepqufgcxewkt.supabase.co';
  const rawKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_h1MmJxWUkjndrmHiPr4ogQ_ba94P';
  const cleanKey = rawKey.replace(/^["'`]|["'`]$/g, '').trim() || 'sb_publishable_h1MmJxWUkjndrmHiPr4ogQ_ba94P';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(cleanUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(cleanKey),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(cleanUrl),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(cleanKey),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(cleanUrl),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(cleanKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(cleanUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(cleanKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
