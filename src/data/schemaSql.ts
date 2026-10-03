export interface SqlSection {
  id: string;
  title: string;
  description: string;
  lineStart: number;
  sql: string;
}

export const COMPLETE_SQL_SCRIPT = `-- ==============================================================================
-- SUPABASE POSTGRESQL PRODUCTION SETUP SCRIPT: MULTI-TENANT LOYALTY STAMP SAAS
-- ==============================================================================
-- Architecture:
-- 1. Multi-Tenant Isolation using Supabase Auth (auth.uid()) and tenant_id
-- 2. Strict Row-Level Security (RLS) on all 6 core tables
-- 3. Automatic updated_at timestamp triggers
-- 4. Automated stamp increment, cooldown enforcement, and cycle completion triggers
-- 5. Atomic stored procedure for merchant staff stamp issuance
-- 6. Comprehensive indexes, foreign key cascading, and data integrity constraints
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSIONS & PREREQUISITES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. CORE TABLES
-- ------------------------------------------------------------------------------

-- Table 1: tenants
-- Stores organization / business accounts subscribing to the SaaS platform
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#4F46E5',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tenant_slug_format CHECK (slug ~* '^[a-z0-9_-]+$')
);

-- Table 2: merchant_users
-- Staff and management accounts linked to Supabase Auth and isolated by tenant
CREATE TABLE IF NOT EXISTS public.merchant_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_merchant_email UNIQUE (tenant_id, email)
);

-- Table 3: customers
-- End-user patrons earning stamps at a merchant's physical or digital store
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    phone_number TEXT,
    email TEXT,
    auth_token_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_customer_contact_exists CHECK (phone_number IS NOT NULL OR email IS NOT NULL),
    CONSTRAINT uq_tenant_customer_phone UNIQUE (tenant_id, phone_number),
    CONSTRAINT uq_tenant_customer_email UNIQUE (tenant_id, email)
);

-- Table 4: loyalty_programs
-- Reward programs defined by the tenant (e.g. "10 Stamps = Free Artisan Pour-Over")
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    required_stamps INTEGER NOT NULL CHECK (required_stamps > 0),
    reward_description TEXT NOT NULL,
    cooldown_minutes INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_minutes >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 5: customer_cards
-- An active loyalty punch card assigned to a customer for a specific program
CREATE TABLE IF NOT EXISTS public.customer_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
    current_stamps INTEGER NOT NULL DEFAULT 0 CHECK (current_stamps >= 0),
    total_completed_cycles INTEGER NOT NULL DEFAULT 0 CHECK (total_completed_cycles >= 0),
    last_stamped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_customer_program UNIQUE (tenant_id, customer_id, program_id)
);

-- Table 6: stamp_transactions
-- Append-only immutable audit ledger recording every stamp earned, voided, or redeemed
CREATE TABLE IF NOT EXISTS public.stamp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.customer_cards(id) ON DELETE CASCADE,
    staff_user_id UUID REFERENCES public.merchant_users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('stamp_added', 'stamp_removed', 'reward_redeemed', 'cycle_reset', 'bonus')),
    stamps_changed INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. HIGH PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_merchant_users_tenant_id ON public.merchant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_tenant_active ON public.loyalty_programs(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_cards_tenant_customer ON public.customer_cards(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_cards_program ON public.customer_cards(program_id);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_card_created ON public.stamp_transactions(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_tenant ON public.stamp_transactions(tenant_id);

-- ------------------------------------------------------------------------------
-- 3. AUTOMATION & TRIGGER FUNCTIONS
-- ------------------------------------------------------------------------------

-- 3.1 Function: Automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all tables with the column
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_merchant_users_updated_at ON public.merchant_users;
CREATE TRIGGER trg_merchant_users_updated_at
    BEFORE UPDATE ON public.merchant_users
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_loyalty_programs_updated_at ON public.loyalty_programs;
CREATE TRIGGER trg_loyalty_programs_updated_at
    BEFORE UPDATE ON public.loyalty_programs
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_cards_updated_at ON public.customer_cards;
CREATE TRIGGER trg_customer_cards_updated_at
    BEFORE UPDATE ON public.customer_cards
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 3.2 Function: Invariant enforcement on customer_cards
-- Ensures that under direct card updates or inserts, current_stamps can NEVER
-- linger above required_stamps without automatically rolling over into completed cycles.
CREATE OR REPLACE FUNCTION public.fn_guard_customer_card_cycles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_required_stamps INTEGER;
    v_completed_cycles INTEGER;
    v_remaining_stamps INTEGER;
BEGIN
    -- Retrieve the threshold for the associated loyalty program
    SELECT required_stamps INTO v_required_stamps
    FROM public.loyalty_programs
    WHERE id = NEW.program_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loyalty program ID % does not exist.', NEW.program_id;
    END IF;

    -- If current stamps meet or surpass required stamps threshold:
    IF NEW.current_stamps >= v_required_stamps THEN
        v_completed_cycles := NEW.current_stamps / v_required_stamps;
        v_remaining_stamps := NEW.current_stamps % v_required_stamps;

        NEW.total_completed_cycles := NEW.total_completed_cycles + v_completed_cycles;
        NEW.current_stamps := v_remaining_stamps;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_customer_card_cycles ON public.customer_cards;
CREATE TRIGGER trg_guard_customer_card_cycles
    BEFORE INSERT OR UPDATE ON public.customer_cards
    FOR EACH ROW EXECUTE FUNCTION public.fn_guard_customer_card_cycles();

-- 3.3 Function: Process Stamp Transactions
-- Fired AFTER INSERT on stamp_transactions.
-- Automatically locks customer_card, validates cooldown, updates stamps, and cycles rewards.
CREATE OR REPLACE FUNCTION public.fn_process_stamp_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_card RECORD;
    v_program RECORD;
    v_new_stamps INTEGER;
    v_cycles_to_add INTEGER := 0;
    v_final_stamps INTEGER;
BEGIN
    -- Lock target customer card for atomic update
    SELECT * INTO v_card
    FROM public.customer_cards
    WHERE id = NEW.card_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer card ID % not found.', NEW.card_id;
    END IF;

    -- Validate tenant match between transaction and card
    IF v_card.tenant_id <> NEW.tenant_id THEN
        RAISE EXCEPTION 'Tenant mismatch between transaction (%) and card (%).', NEW.tenant_id, v_card.tenant_id;
    END IF;

    -- Fetch loyalty program details
    SELECT * INTO v_program
    FROM public.loyalty_programs
    WHERE id = v_card.program_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Associated loyalty program not found.';
    END IF;

    -- Enforce anti-abuse cooldown restriction if adding stamps
    IF NEW.type = 'stamp_added' AND NEW.stamps_changed > 0 AND v_program.cooldown_minutes > 0 THEN
        IF v_card.last_stamped_at IS NOT NULL AND 
           v_card.last_stamped_at + (v_program.cooldown_minutes * INTERVAL '1 minute') > NEW.created_at THEN
            RAISE EXCEPTION 'Anti-fraud cooldown active: You must wait % minutes between stamps. Last stamped at %.', 
                v_program.cooldown_minutes, v_card.last_stamped_at;
        END IF;
    END IF;

    -- Compute new stamp count
    v_new_stamps := v_card.current_stamps + NEW.stamps_changed;

    IF v_new_stamps < 0 THEN
        RAISE EXCEPTION 'Insufficient stamps: Resulting stamps cannot be negative (attempted % on balance %).', 
            v_new_stamps, v_card.current_stamps;
    END IF;

    -- Calculate threshold cycles rollover
    IF v_new_stamps >= v_program.required_stamps THEN
        v_cycles_to_add := v_new_stamps / v_program.required_stamps;
        v_final_stamps := v_new_stamps % v_program.required_stamps;
    ELSE
        v_final_stamps := v_new_stamps;
    END IF;

    -- Update customer card state atomically
    UPDATE public.customer_cards
    SET current_stamps = v_final_stamps,
        total_completed_cycles = total_completed_cycles + v_cycles_to_add,
        last_stamped_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.card_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_stamp_transaction ON public.stamp_transactions;
CREATE TRIGGER trg_process_stamp_transaction
    AFTER INSERT ON public.stamp_transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_process_stamp_transaction();

-- ------------------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Returns tenant_id associated with current authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT tenant_id 
    FROM public.merchant_users 
    WHERE id = auth.uid() 
    LIMIT 1;
$$;

-- Returns role of the authenticated merchant user within a specified tenant
CREATE OR REPLACE FUNCTION public.get_auth_merchant_role(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role 
    FROM public.merchant_users 
    WHERE id = auth.uid() AND tenant_id = p_tenant_id 
    LIMIT 1;
$$;

-- Checks if the authenticated user is a staff member or manager in the given tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.merchant_users 
        WHERE id = auth.uid() AND tenant_id = p_tenant_id
    );
$$;

-- ------------------------------------------------------------------------------
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all 6 core tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_transactions ENABLE ROW LEVEL SECURITY;

-- 5.1 TENANTS POLICIES
DROP POLICY IF EXISTS "Allow members to view their tenant" ON public.tenants;
CREATE POLICY "Allow members to view their tenant"
    ON public.tenants
    FOR SELECT
    USING (
        id = public.get_auth_tenant_id()
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Allow authenticated users to create tenant" ON public.tenants;
CREATE POLICY "Allow authenticated users to create tenant"
    ON public.tenants
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow owners/admins to update tenant" ON public.tenants;
CREATE POLICY "Allow owners/admins to update tenant"
    ON public.tenants
    FOR UPDATE
    USING (
        public.get_auth_merchant_role(id) IN ('owner', 'admin')
    )
    WITH CHECK (
        public.get_auth_merchant_role(id) IN ('owner', 'admin')
    );

-- 5.2 MERCHANT USERS POLICIES
DROP POLICY IF EXISTS "Allow staff to view peers in same tenant" ON public.merchant_users;
CREATE POLICY "Allow staff to view peers in same tenant"
    ON public.merchant_users
    FOR SELECT
    USING (
        tenant_id = public.get_auth_tenant_id() 
        OR id = auth.uid()
    );

DROP POLICY IF EXISTS "Allow owners/admins to add staff" ON public.merchant_users;
CREATE POLICY "Allow owners/admins to add staff"
    ON public.merchant_users
    FOR INSERT
    WITH CHECK (
        public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin')
        OR id = auth.uid()
    );

DROP POLICY IF EXISTS "Allow role management or self-update" ON public.merchant_users;
CREATE POLICY "Allow role management or self-update"
    ON public.merchant_users
    FOR UPDATE
    USING (
        public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin') 
        OR id = auth.uid()
    );

DROP POLICY IF EXISTS "Allow owners to remove staff" ON public.merchant_users;
CREATE POLICY "Allow owners to remove staff"
    ON public.merchant_users
    FOR DELETE
    USING (
        public.get_auth_merchant_role(tenant_id) = 'owner'
    );

-- 5.3 CUSTOMERS POLICIES
DROP POLICY IF EXISTS "Allow staff to view tenant customers" ON public.customers;
CREATE POLICY "Allow staff to view tenant customers"
    ON public.customers
    FOR SELECT
    USING (
        tenant_id = public.get_auth_tenant_id()
    );

DROP POLICY IF EXISTS "Allow staff to register customers" ON public.customers;
CREATE POLICY "Allow staff to register customers"
    ON public.customers
    FOR INSERT
    WITH CHECK (
        tenant_id = public.get_auth_tenant_id()
    );

DROP POLICY IF EXISTS "Allow staff to update customer info" ON public.customers;
CREATE POLICY "Allow staff to update customer info"
    ON public.customers
    FOR UPDATE
    USING (
        tenant_id = public.get_auth_tenant_id()
    )
    WITH CHECK (
        tenant_id = public.get_auth_tenant_id()
    );

-- 5.4 LOYALTY PROGRAMS POLICIES
DROP POLICY IF EXISTS "Allow staff and patrons to view active programs" ON public.loyalty_programs;
CREATE POLICY "Allow staff and patrons to view active programs"
    ON public.loyalty_programs
    FOR SELECT
    USING (
        tenant_id = public.get_auth_tenant_id()
        OR is_active = TRUE
    );

DROP POLICY IF EXISTS "Allow managers to create programs" ON public.loyalty_programs;
CREATE POLICY "Allow managers to create programs"
    ON public.loyalty_programs
    FOR INSERT
    WITH CHECK (
        public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin', 'manager')
    );

DROP POLICY IF EXISTS "Allow managers to update programs" ON public.loyalty_programs;
CREATE POLICY "Allow managers to update programs"
    ON public.loyalty_programs
    FOR UPDATE
    USING (
        public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin', 'manager')
    )
    WITH CHECK (
        public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin', 'manager')
    );

-- 5.5 CUSTOMER CARDS POLICIES
DROP POLICY IF EXISTS "Allow staff to view customer cards" ON public.customer_cards;
CREATE POLICY "Allow staff to view customer cards"
    ON public.customer_cards
    FOR SELECT
    USING (
        tenant_id = public.get_auth_tenant_id()
    );

DROP POLICY IF EXISTS "Allow staff to issue customer cards" ON public.customer_cards;
CREATE POLICY "Allow staff to issue customer cards"
    ON public.customer_cards
    FOR INSERT
    WITH CHECK (
        tenant_id = public.get_auth_tenant_id()
    );

DROP POLICY IF EXISTS "Allow staff to update customer cards" ON public.customer_cards;
CREATE POLICY "Allow staff to update customer cards"
    ON public.customer_cards
    FOR UPDATE
    USING (
        tenant_id = public.get_auth_tenant_id()
    )
    WITH CHECK (
        tenant_id = public.get_auth_tenant_id()
    );

-- 5.6 STAMP TRANSACTIONS POLICIES (Append-Only Immutable Ledger)
DROP POLICY IF EXISTS "Allow staff to view transactions" ON public.stamp_transactions;
CREATE POLICY "Allow staff to view transactions"
    ON public.stamp_transactions
    FOR SELECT
    USING (
        tenant_id = public.get_auth_tenant_id()
    );

DROP POLICY IF EXISTS "Allow staff to log transactions" ON public.stamp_transactions;
CREATE POLICY "Allow staff to log transactions"
    ON public.stamp_transactions
    FOR INSERT
    WITH CHECK (
        tenant_id = public.get_auth_tenant_id()
        AND (staff_user_id IS NULL OR staff_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Prohibit transaction modification" ON public.stamp_transactions;
CREATE POLICY "Prohibit transaction modification"
    ON public.stamp_transactions
    FOR UPDATE
    USING (FALSE);

DROP POLICY IF EXISTS "Prohibit transaction deletion" ON public.stamp_transactions;
CREATE POLICY "Prohibit transaction deletion"
    ON public.stamp_transactions
    FOR DELETE
    USING (FALSE);

-- ------------------------------------------------------------------------------
-- 6. RPC STORED PROCEDURE: ATOMIC STAMP ISSUANCE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_customer_stamps(
    p_card_id UUID,
    p_stamps_to_add INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_caller_tenant_id UUID;
    v_card RECORD;
    v_txn_id UUID;
    v_updated_card RECORD;
    v_cycles_completed_delta INTEGER;
BEGIN
    v_caller_uid := auth.uid();
    
    -- Retrieve caller's tenant
    SELECT tenant_id INTO v_caller_tenant_id
    FROM public.merchant_users
    WHERE id = v_caller_uid;

    IF v_caller_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a recognized merchant user.';
    END IF;

    -- Lock and verify card exists and matches tenant
    SELECT * INTO v_card
    FROM public.customer_cards
    WHERE id = p_card_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Card ID % not found.', p_card_id;
    END IF;

    IF v_card.tenant_id <> v_caller_tenant_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: Card does not belong to your organization.';
    END IF;

    -- Append stamp transaction (this automatically activates trg_process_stamp_transaction)
    INSERT INTO public.stamp_transactions (
        tenant_id,
        card_id,
        staff_user_id,
        type,
        stamps_changed
    ) VALUES (
        v_caller_tenant_id,
        p_card_id,
        v_caller_uid,
        'stamp_added',
        p_stamps_to_add
    ) RETURNING id INTO v_txn_id;

    -- Re-fetch updated card to report outcome
    SELECT * INTO v_updated_card
    FROM public.customer_cards
    WHERE id = p_card_id;

    v_cycles_completed_delta := v_updated_card.total_completed_cycles - v_card.total_completed_cycles;

    RETURN jsonb_build_object(
        'success', TRUE,
        'transaction_id', v_txn_id,
        'card_id', p_card_id,
        'previous_stamps', v_card.current_stamps,
        'current_stamps', v_updated_card.current_stamps,
        'new_cycles_unlocked', v_cycles_completed_delta,
        'total_completed_cycles', v_updated_card.total_completed_cycles,
        'last_stamped_at', v_updated_card.last_stamped_at
    );
END;
$$;
`;

export const SQL_SECTIONS: SqlSection[] = [
  {
    id: 'tables',
    title: '1. Core Tables & DDL',
    description: '6 core relational tables with foreign keys, checks, and unique constraints',
    lineStart: 18,
    sql: `-- Core Tables Schema (6 tables)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#4F46E5',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tenant_slug_format CHECK (slug ~* '^[a-z0-9_-]+$')
);

CREATE TABLE IF NOT EXISTS public.merchant_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_merchant_email UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    phone_number TEXT,
    email TEXT,
    auth_token_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_customer_contact_exists CHECK (phone_number IS NOT NULL OR email IS NOT NULL),
    CONSTRAINT uq_tenant_customer_phone UNIQUE (tenant_id, phone_number),
    CONSTRAINT uq_tenant_customer_email UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    required_stamps INTEGER NOT NULL CHECK (required_stamps > 0),
    reward_description TEXT NOT NULL,
    cooldown_minutes INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_minutes >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
    current_stamps INTEGER NOT NULL DEFAULT 0 CHECK (current_stamps >= 0),
    total_completed_cycles INTEGER NOT NULL DEFAULT 0 CHECK (total_completed_cycles >= 0),
    last_stamped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_customer_program UNIQUE (tenant_id, customer_id, program_id)
);

CREATE TABLE IF NOT EXISTS public.stamp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.customer_cards(id) ON DELETE CASCADE,
    staff_user_id UUID REFERENCES public.merchant_users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('stamp_added', 'stamp_removed', 'reward_redeemed', 'cycle_reset', 'bonus')),
    stamps_changed INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
  },
  {
    id: 'indexes',
    title: '2. High-Performance Indexes',
    description: 'Optimized B-tree indexes on tenant_id, compound lookups, and transaction ordering',
    lineStart: 95,
    sql: `-- High-Performance Multi-Tenant B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_merchant_users_tenant_id ON public.merchant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_tenant_active ON public.loyalty_programs(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_cards_tenant_customer ON public.customer_cards(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_cards_program ON public.customer_cards(program_id);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_card_created ON public.stamp_transactions(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_tenant ON public.stamp_transactions(tenant_id);`
  },
  {
    id: 'triggers',
    title: '3. Automation & Triggers',
    description: 'Automated updated_at, stamp threshold increment, cooldown checking, and cycle resets',
    lineStart: 110,
    sql: `-- 3.1 Function: Automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_merchant_users_updated_at BEFORE UPDATE ON public.merchant_users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_loyalty_programs_updated_at BEFORE UPDATE ON public.loyalty_programs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_customer_cards_updated_at BEFORE UPDATE ON public.customer_cards FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 3.2 Function: Invariant enforcement on customer_cards
CREATE OR REPLACE FUNCTION public.fn_guard_customer_card_cycles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_required_stamps INTEGER;
    v_completed_cycles INTEGER;
    v_remaining_stamps INTEGER;
BEGIN
    SELECT required_stamps INTO v_required_stamps FROM public.loyalty_programs WHERE id = NEW.program_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Loyalty program ID % does not exist.', NEW.program_id; END IF;

    IF NEW.current_stamps >= v_required_stamps THEN
        v_completed_cycles := NEW.current_stamps / v_required_stamps;
        v_remaining_stamps := NEW.current_stamps % v_required_stamps;
        NEW.total_completed_cycles := NEW.total_completed_cycles + v_completed_cycles;
        NEW.current_stamps := v_remaining_stamps;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_customer_card_cycles BEFORE INSERT OR UPDATE ON public.customer_cards FOR EACH ROW EXECUTE FUNCTION public.fn_guard_customer_card_cycles();

-- 3.3 Function: Stamp Transaction Processor (Cooldown + Card Roll-Over)
CREATE OR REPLACE FUNCTION public.fn_process_stamp_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_card RECORD;
    v_program RECORD;
    v_new_stamps INTEGER;
    v_cycles_to_add INTEGER := 0;
    v_final_stamps INTEGER;
BEGIN
    SELECT * INTO v_card FROM public.customer_cards WHERE id = NEW.card_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer card ID % not found.', NEW.card_id; END IF;
    IF v_card.tenant_id <> NEW.tenant_id THEN RAISE EXCEPTION 'Tenant mismatch.'; END IF;

    SELECT * INTO v_program FROM public.loyalty_programs WHERE id = v_card.program_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Associated loyalty program not found.'; END IF;

    -- Anti-fraud cooldown check
    IF NEW.type = 'stamp_added' AND NEW.stamps_changed > 0 AND v_program.cooldown_minutes > 0 THEN
        IF v_card.last_stamped_at IS NOT NULL AND 
           v_card.last_stamped_at + (v_program.cooldown_minutes * INTERVAL '1 minute') > NEW.created_at THEN
            RAISE EXCEPTION 'Anti-fraud cooldown active: You must wait % minutes between stamps.', v_program.cooldown_minutes;
        END IF;
    END IF;

    v_new_stamps := v_card.current_stamps + NEW.stamps_changed;
    IF v_new_stamps < 0 THEN RAISE EXCEPTION 'Resulting stamps cannot be negative.'; END IF;

    IF v_new_stamps >= v_program.required_stamps THEN
        v_cycles_to_add := v_new_stamps / v_program.required_stamps;
        v_final_stamps := v_new_stamps % v_program.required_stamps;
    ELSE
        v_final_stamps := v_new_stamps;
    END IF;

    UPDATE public.customer_cards
    SET current_stamps = v_final_stamps,
        total_completed_cycles = total_completed_cycles + v_cycles_to_add,
        last_stamped_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.card_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_stamp_transaction AFTER INSERT ON public.stamp_transactions FOR EACH ROW EXECUTE FUNCTION public.fn_process_stamp_transaction();`
  },
  {
    id: 'rls',
    title: '4. Row-Level Security (RLS)',
    description: 'Strict auth.uid() and tenant_id isolation policies across all tables',
    lineStart: 250,
    sql: `-- Enable RLS on all 6 tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_transactions ENABLE ROW LEVEL SECURITY;

-- Helper security definer functions for optimal query performance
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT tenant_id FROM public.merchant_users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_merchant_role(p_tenant_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT role FROM public.merchant_users WHERE id = auth.uid() AND tenant_id = p_tenant_id LIMIT 1;
$$;

-- TENANTS Policies
CREATE POLICY "Allow members to view their tenant" ON public.tenants FOR SELECT USING (id = public.get_auth_tenant_id() OR auth.role() = 'service_role');
CREATE POLICY "Allow authenticated users to create tenant" ON public.tenants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow owners/admins to update tenant" ON public.tenants FOR UPDATE USING (public.get_auth_merchant_role(id) IN ('owner', 'admin'));

-- MERCHANT USERS Policies
CREATE POLICY "Allow staff to view peers in same tenant" ON public.merchant_users FOR SELECT USING (tenant_id = public.get_auth_tenant_id() OR id = auth.uid());
CREATE POLICY "Allow owners/admins to add staff" ON public.merchant_users FOR INSERT WITH CHECK (public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin') OR id = auth.uid());
CREATE POLICY "Allow role management or self-update" ON public.merchant_users FOR UPDATE USING (public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin') OR id = auth.uid());
CREATE POLICY "Allow owners to remove staff" ON public.merchant_users FOR DELETE USING (public.get_auth_merchant_role(tenant_id) = 'owner');

-- CUSTOMERS Policies
CREATE POLICY "Allow staff to view tenant customers" ON public.customers FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Allow staff to register customers" ON public.customers FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Allow staff to update customer info" ON public.customers FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());

-- LOYALTY PROGRAMS Policies
CREATE POLICY "Allow staff and patrons to view active programs" ON public.loyalty_programs FOR SELECT USING (tenant_id = public.get_auth_tenant_id() OR is_active = TRUE);
CREATE POLICY "Allow managers to create programs" ON public.loyalty_programs FOR INSERT WITH CHECK (public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Allow managers to update programs" ON public.loyalty_programs FOR UPDATE USING (public.get_auth_merchant_role(tenant_id) IN ('owner', 'admin', 'manager'));

-- CUSTOMER CARDS Policies
CREATE POLICY "Allow staff to view customer cards" ON public.customer_cards FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Allow staff to issue customer cards" ON public.customer_cards FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Allow staff to update customer cards" ON public.customer_cards FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());

-- STAMP TRANSACTIONS (Append-Only Ledger)
CREATE POLICY "Allow staff to view transactions" ON public.stamp_transactions FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Allow staff to log transactions" ON public.stamp_transactions FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id() AND (staff_user_id IS NULL OR staff_user_id = auth.uid()));
CREATE POLICY "Prohibit transaction modification" ON public.stamp_transactions FOR UPDATE USING (FALSE);
CREATE POLICY "Prohibit transaction deletion" ON public.stamp_transactions FOR DELETE USING (FALSE);`
  },
  {
    id: 'rpc',
    title: '5. Atomic Stored Procedure (RPC)',
    description: 'Concurrency-safe procedure issue_customer_stamps() callable via supabase.rpc()',
    lineStart: 380,
    sql: `-- High-convenience atomic stamping procedure
CREATE OR REPLACE FUNCTION public.issue_customer_stamps(
    p_card_id UUID,
    p_stamps_to_add INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_caller_tenant_id UUID;
    v_card RECORD;
    v_txn_id UUID;
    v_updated_card RECORD;
    v_cycles_completed_delta INTEGER;
BEGIN
    v_caller_uid := auth.uid();
    
    SELECT tenant_id INTO v_caller_tenant_id
    FROM public.merchant_users
    WHERE id = v_caller_uid;

    IF v_caller_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a recognized merchant user.';
    END IF;

    SELECT * INTO v_card
    FROM public.customer_cards
    WHERE id = p_card_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Card ID % not found.', p_card_id;
    END IF;

    IF v_card.tenant_id <> v_caller_tenant_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: Card does not belong to your organization.';
    END IF;

    INSERT INTO public.stamp_transactions (
        tenant_id,
        card_id,
        staff_user_id,
        type,
        stamps_changed
    ) VALUES (
        v_caller_tenant_id,
        p_card_id,
        v_caller_uid,
        'stamp_added',
        p_stamps_to_add
    ) RETURNING id INTO v_txn_id;

    SELECT * INTO v_updated_card
    FROM public.customer_cards
    WHERE id = p_card_id;

    v_cycles_completed_delta := v_updated_card.total_completed_cycles - v_card.total_completed_cycles;

    RETURN jsonb_build_object(
        'success', TRUE,
        'transaction_id', v_txn_id,
        'card_id', p_card_id,
        'previous_stamps', v_card.current_stamps,
        'current_stamps', v_updated_card.current_stamps,
        'new_cycles_unlocked', v_cycles_completed_delta,
        'total_completed_cycles', v_updated_card.total_completed_cycles,
        'last_stamped_at', v_updated_card.last_stamped_at
    );
END;
$$;`
  }
];
