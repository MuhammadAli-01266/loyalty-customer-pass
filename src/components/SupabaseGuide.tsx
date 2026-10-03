import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Code2 } from 'lucide-react';

interface SupabaseGuideProps {
  onCopyText: (text: string) => void;
}

export const SupabaseGuide: React.FC<SupabaseGuideProps> = ({ onCopyText }) => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    onCopyText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const cliSnippet = `# 1. Install or update Supabase CLI
npm i -g supabase

# 2. Initialize project (if not already done)
supabase init

# 3. Create a new timestamped migration
supabase migration new init_loyalty_stamp_saas

# 4. Copy the SQL script into supabase/migrations/<timestamp>_init_loyalty_stamp_saas.sql
# 5. Apply the migration to your local or remote database:
supabase db push
# or for local development:
supabase db reset`;

  const clientTsSnippet = `import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Issue stamps to a customer's loyalty card.
 * Automatically handles:
 * - Tenant isolation verification
 * - Cooldown enforcement
 * - Cycle completion & stamp remainder calculation
 */
export async function issueStamps(cardId: string, count: number = 1) {
  const { data, error } = await supabase.rpc('issue_customer_stamps', {
    p_card_id: cardId,
    p_stamps_to_add: count,
  });

  if (error) {
    console.error('Failed to issue stamp:', error.message);
    throw error;
  }

  // data contains:
  // {
  //   success: true,
  //   transaction_id: '...',
  //   card_id: '...',
  //   current_stamps: 2,
  //   new_cycles_unlocked: 1, // e.g. unlocked 1 free coffee!
  //   total_completed_cycles: 3,
  //   last_stamped_at: '...'
  // }
  return data;
}

/**
 * Fetch customer cards for current merchant's tenant.
 * RLS automatically restricts this to cards matching caller's tenant_id!
 */
export async function getTenantCustomerCards() {
  const { data, error } = await supabase
    .from('customer_cards')
    .select(\`
      id,
      current_stamps,
      total_completed_cycles,
      last_stamped_at,
      customers (id, phone_number, email),
      loyalty_programs (title, required_stamps, reward_description)
    \`)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}`;

  const authTriggerSnippet = `-- Optional: Auto-create merchant_user profile on Supabase auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_merchant_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_business_name TEXT;
    v_slug TEXT;
BEGIN
    -- Extract tenant metadata passed during supabase.auth.signUp()
    v_business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Store');
    v_slug := LOWER(REGEXP_REPLACE(v_business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::text, 1, 6);

    -- 1. Create default organization tenant
    INSERT INTO public.tenants (name, slug)
    VALUES (v_business_name, v_slug)
    RETURNING id INTO v_tenant_id;

    -- 2. Link newly registered user as the organization 'owner'
    INSERT INTO public.merchant_users (id, tenant_id, email, role)
    VALUES (NEW.id, v_tenant_id, NEW.email, 'owner');

    -- 3. Provision a default loyalty punch card program (e.g. 10 stamps)
    INSERT INTO public.loyalty_programs (tenant_id, title, required_stamps, reward_description, cooldown_minutes)
    VALUES (v_tenant_id, 'Standard Loyalty Card', 10, 'Free Item of Choice', 2);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_merchant_signup();`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <span>Supabase Production Runbook</span>
              <span aria-hidden="true">·</span>
              <span>Migration Instructions</span>
              <span aria-hidden="true">·</span>
              <span>TypeScript SDK Integration</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
              Deployment Runbook & Integration Guide
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Step-by-step instructions to run this migration on Supabase Cloud or locally with Supabase CLI,
              integrate with <code className="text-emerald-400 font-mono">@supabase/supabase-js</code>, and automate merchant onboarding.
            </p>
          </div>

          <a
            href="https://supabase.com/docs/guides/database/postgres/row-level-security"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>Supabase RLS Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Deployment Method 1 & 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Method 1: Supabase Web Dashboard */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <span className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs">1</span>
            <span>Option A: Supabase Web Dashboard (Instant)</span>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
            <li>Log into your project at <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">supabase.com/dashboard</a>.</li>
            <li>Click on <strong>SQL Editor</strong> in the left navigation sidebar.</li>
            <li>Click <strong>+ New Query</strong>.</li>
            <li>Paste the complete SQL script from the <strong>SQL Script</strong> tab.</li>
            <li>Click <strong>RUN (Ctrl+Enter)</strong>. All 6 tables, triggers, indexes, and RLS policies will be provisioned in ~1 second.</li>
          </ol>
        </div>

        {/* Method 2: Supabase CLI */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs">2</span>
              <span>Option B: Supabase CLI (GitOps & Migrations)</span>
            </div>
            <button
              onClick={() => handleCopy('cli', cliSnippet)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copiedSnippet === 'cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet === 'cli' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
            <pre>{cliSnippet}</pre>
          </div>
        </div>
      </div>

      {/* TypeScript Integration */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>Frontend Application Integration (TypeScript + @supabase/supabase-js)</span>
          </div>
          <button
            onClick={() => handleCopy('ts', clientTsSnippet)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            {copiedSnippet === 'ts' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSnippet === 'ts' ? 'Copied Snippet' : 'Copy Code'}</span>
          </button>
        </div>
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
          <pre>{clientTsSnippet}</pre>
        </div>
      </div>

      {/* Optional Auth Trigger for Automatic Merchant Setup */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Optional: Supabase Auth Trigger for Automatic Merchant Signup</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automatically creates a tenant organization and links the new user as owner when a merchant signs up via <code className="text-slate-300 font-mono">supabase.auth.signUp()</code>.
            </p>
          </div>
          <button
            onClick={() => handleCopy('auth', authTriggerSnippet)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            {copiedSnippet === 'auth' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSnippet === 'auth' ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-80">
          <pre>{authTriggerSnippet}</pre>
        </div>
      </div>
    </div>
  );
};
