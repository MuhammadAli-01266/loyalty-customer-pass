export interface ColumnDef {
  name: string;
  type: string;
  isPrimary?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    column: string;
    onDelete?: string;
  };
  checkConstraint?: string;
  description: string;
}

export interface TableDef {
  name: string;
  displayName: string;
  description: string;
  columns: ColumnDef[];
  uniqueConstraints: string[];
  triggers: string[];
  rlsPolicies: {
    command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    name: string;
    role: string;
    clause: string;
    rationale: string;
  }[];
}

export const TABLES: TableDef[] = [
  {
    name: 'tenants',
    displayName: 'tenants',
    description: 'Core organizational subscriber accounts representing individual businesses or brands.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, defaultValue: 'gen_random_uuid()', description: 'Unique identifier for the tenant' },
      { name: 'name', type: 'TEXT', isNullable: false, description: 'Brand or business commercial name' },
      { name: 'slug', type: 'TEXT', isNullable: false, checkConstraint: "slug ~* '^[a-z0-9_-]+$'", description: 'URL-safe tenant slug for customer stamp cards' },
      { name: 'logo_url', type: 'TEXT', isNullable: true, description: 'Hosted logo image URL' },
      { name: 'primary_color', type: 'TEXT', isNullable: true, defaultValue: "'#4F46E5'", description: 'Brand primary accent color hex' },
      { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Account creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Auto-updated via fn_set_updated_at trigger' }
    ],
    uniqueConstraints: ['UNIQUE (slug)'],
    triggers: ['trg_tenants_updated_at (BEFORE UPDATE -> fn_set_updated_at)'],
    rlsPolicies: [
      { command: 'SELECT', name: 'Allow members to view their tenant', role: 'tenant_member', clause: 'id = get_auth_tenant_id() OR auth.role() = service_role', rationale: 'Merchants only see their own organization profile.' },
      { command: 'INSERT', name: 'Allow authenticated users to create tenant', role: 'authenticated', clause: 'auth.role() = authenticated', rationale: 'Allows new SaaS users to onboard during initial registration.' },
      { command: 'UPDATE', name: 'Allow owners/admins to update tenant', role: 'owner, admin', clause: 'get_auth_merchant_role(id) IN (owner, admin)', rationale: 'Restricts branding and settings changes to organization leadership.' }
    ]
  },
  {
    name: 'merchant_users',
    displayName: 'merchant_users',
    description: 'Staff members, managers, and owners mapped directly to Supabase Auth (auth.users).',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, references: { table: 'auth.users', column: 'id', onDelete: 'CASCADE' }, description: 'Supabase Auth user ID (auth.uid())' },
      { name: 'tenant_id', type: 'UUID', isNullable: false, references: { table: 'tenants', column: 'id', onDelete: 'CASCADE' }, description: 'Tenant foreign key for strict tenancy isolation' },
      { name: 'email', type: 'TEXT', isNullable: false, description: 'Staff login email address' },
      { name: 'role', type: 'TEXT', isNullable: false, defaultValue: "'staff'", checkConstraint: "role IN ('owner', 'admin', 'manager', 'staff')", description: 'Permission level within the tenant' },
      { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Record creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Auto-updated via fn_set_updated_at trigger' }
    ],
    uniqueConstraints: ['UNIQUE (tenant_id, email)'],
    triggers: ['trg_merchant_users_updated_at (BEFORE UPDATE -> fn_set_updated_at)'],
    rlsPolicies: [
      { command: 'SELECT', name: 'Allow staff to view peers in same tenant', role: 'staff', clause: 'tenant_id = get_auth_tenant_id() OR id = auth.uid()', rationale: 'Team directory visibility within the same tenant only.' },
      { command: 'INSERT', name: 'Allow owners/admins to add staff', role: 'owner, admin', clause: 'get_auth_merchant_role(tenant_id) IN (owner, admin) OR id = auth.uid()', rationale: 'Only company admins or self on initial signup can create merchant records.' },
      { command: 'UPDATE', name: 'Allow role management or self-update', role: 'owner, admin', clause: 'get_auth_merchant_role(tenant_id) IN (owner, admin) OR id = auth.uid()', rationale: 'Prevents staff from elevating their own permissions.' },
      { command: 'DELETE', name: 'Allow owners to remove staff', role: 'owner', clause: 'get_auth_merchant_role(tenant_id) = owner', rationale: 'Prevents rogue staff de-provisioning.' }
    ]
  },
  {
    name: 'customers',
    displayName: 'customers',
    description: 'Patrons earning loyalty rewards, scoped by tenant for privacy and isolation.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, defaultValue: 'gen_random_uuid()', description: 'Unique customer identifier' },
      { name: 'tenant_id', type: 'UUID', isNullable: false, references: { table: 'tenants', column: 'id', onDelete: 'CASCADE' }, description: 'Tenant isolation key' },
      { name: 'phone_number', type: 'TEXT', isNullable: true, description: 'E.164 phone number for punch card lookup' },
      { name: 'email', type: 'TEXT', isNullable: true, description: 'Customer notification email' },
      { name: 'auth_token_hash', type: 'TEXT', isNullable: true, description: 'Hashed token for passwordless digital wallet access' },
      { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Customer enrollment timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Auto-updated via fn_set_updated_at trigger' }
    ],
    uniqueConstraints: ['UNIQUE (tenant_id, phone_number)', 'UNIQUE (tenant_id, email)', 'CHECK (phone_number IS NOT NULL OR email IS NOT NULL)'],
    triggers: ['trg_customers_updated_at (BEFORE UPDATE -> fn_set_updated_at)'],
    rlsPolicies: [
      { command: 'SELECT', name: 'Allow staff to view tenant customers', role: 'merchant_staff', clause: 'tenant_id = get_auth_tenant_id()', rationale: 'Staff can only search and view patrons of their own business.' },
      { command: 'INSERT', name: 'Allow staff to register customers', role: 'merchant_staff', clause: 'tenant_id = get_auth_tenant_id()', rationale: 'Staff can onboard patrons at the point of sale.' },
      { command: 'UPDATE', name: 'Allow staff to update customer info', role: 'merchant_staff', clause: 'tenant_id = get_auth_tenant_id()', rationale: 'Enables updating phone number or email within tenant.' }
    ]
  },
  {
    name: 'loyalty_programs',
    displayName: 'loyalty_programs',
    description: 'Campaign rules setting target stamp thresholds, rewards, and anti-abuse cooldowns.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, defaultValue: 'gen_random_uuid()', description: 'Unique loyalty program identifier' },
      { name: 'tenant_id', type: 'UUID', isNullable: false, references: { table: 'tenants', column: 'id', onDelete: 'CASCADE' }, description: 'Tenant isolation key' },
      { name: 'title', type: 'TEXT', isNullable: false, description: 'Program title (e.g. Daily Coffee Rewards)' },
      { name: 'required_stamps', type: 'INTEGER', isNullable: false, checkConstraint: 'required_stamps > 0', description: 'Stamps required before reward unlocks and cycle completes' },
      { name: 'reward_description', type: 'TEXT', isNullable: false, description: 'Description of free item or reward' },
      { name: 'cooldown_minutes', type: 'INTEGER', isNullable: false, defaultValue: '0', checkConstraint: 'cooldown_minutes >= 0', description: 'Anti-fraud cooldown window in minutes between stamps' },
      { name: 'is_active', type: 'BOOLEAN', isNullable: false, defaultValue: 'TRUE', description: 'Status switch for public enrollment' },
      { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Program creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Auto-updated via fn_set_updated_at trigger' }
    ],
    uniqueConstraints: [],
    triggers: ['trg_loyalty_programs_updated_at (BEFORE UPDATE -> fn_set_updated_at)'],
    rlsPolicies: [
      { command: 'SELECT', name: 'Allow staff and patrons to view active programs', role: 'public & staff', clause: 'tenant_id = get_auth_tenant_id() OR is_active = TRUE', rationale: 'Patrons can view program rules on public web card; staff sees all.' },
      { command: 'INSERT', name: 'Allow managers to create programs', role: 'owner, admin, manager', clause: 'get_auth_merchant_role(tenant_id) IN (owner, admin, manager)', rationale: 'Regular cashiers cannot configure reward thresholds.' },
      { command: 'UPDATE', name: 'Allow managers to update programs', role: 'owner, admin, manager', clause: 'get_auth_merchant_role(tenant_id) IN (owner, admin, manager)', rationale: 'Restricts threshold modifications to management.' }
    ]
  },
  {
    name: 'customer_cards',
    displayName: 'customer_cards',
    description: 'Active punch cards maintaining live stamp tally, completed reward cycles, and timestamps.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, defaultValue: 'gen_random_uuid()', description: 'Unique card identifier' },
      { name: 'tenant_id', type: 'UUID', isNullable: false, references: { table: 'tenants', column: 'id', onDelete: 'CASCADE' }, description: 'Tenant isolation key' },
      { name: 'customer_id', type: 'UUID', isNullable: false, references: { table: 'customers', column: 'id', onDelete: 'CASCADE' }, description: 'Owner customer reference' },
      { name: 'program_id', type: 'UUID', isNullable: false, references: { table: 'loyalty_programs', column: 'id', onDelete: 'CASCADE' }, description: 'Loyalty program reference' },
      { name: 'current_stamps', type: 'INTEGER', isNullable: false, defaultValue: '0', checkConstraint: 'current_stamps >= 0', description: 'Current stamps accumulated in ongoing cycle' },
      { name: 'total_completed_cycles', type: 'INTEGER', isNullable: false, defaultValue: '0', checkConstraint: 'total_completed_cycles >= 0', description: 'Total rewards unlocked across all card cycles' },
      { name: 'last_stamped_at', type: 'TIMESTAMPTZ', isNullable: true, description: 'Timestamp of latest stamp for cooldown verification' },
      { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Card issue date' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Auto-updated via fn_set_updated_at trigger' }
    ],
    uniqueConstraints: ['UNIQUE (tenant_id, customer_id, program_id)'],
    triggers: [
      'trg_customer_cards_updated_at (BEFORE UPDATE -> fn_set_updated_at)',
      'trg_guard_customer_card_cycles (BEFORE INSERT OR UPDATE -> fn_guard_customer_card_cycles)'
    ],
    rlsPolicies: [
      { command: 'SELECT', name: 'Allow staff to view customer cards', role: 'merchant_staff', clause: 'tenant_id = get_auth_tenant_id()', rationale: 'Merchants can only query cards within their organization.' },
      { command: 'INSERT', name: 'Allow staff to issue customer cards', role: 'merchant_staff', clause: 'tenant_id = get_auth_tenant_id()', rationale: 'Staff can issue new cards to customers.' },
      { command: 'UPDATE', name: 'Allow staff to update customer cards', role: 'merchant_staff', clause: 'tenant_id = get_auth_tenant_id()', rationale: 'Allows updating cards within the same tenant.' }
    ]
  },
  {
    name: 'stamp_transactions',
    displayName: 'stamp_transactions',
    description: 'Append-only immutable audit ledger recording every stamp modification and triggering automatic cycle roll-overs.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, defaultValue: 'gen_random_uuid()', description: 'Ledger entry UUID' },
      { name: 'tenant_id', type: 'UUID', isNullable: false, references: { table: 'tenants', column: 'id', onDelete: 'CASCADE' }, description: 'Tenant isolation key' },
      { name: 'card_id', type: 'UUID', isNullable: false, references: { table: 'customer_cards', column: 'id', onDelete: 'CASCADE' }, description: 'Card that received the transaction' },
      { name: 'staff_user_id', type: 'UUID', isNullable: true, references: { table: 'merchant_users', column: 'id', onDelete: 'SET NULL' }, description: 'Staff member who stamped the card' },
      { name: 'type', type: 'TEXT', isNullable: false, checkConstraint: "type IN ('stamp_added', 'stamp_removed', 'reward_redeemed', 'cycle_reset', 'bonus')", description: 'Transaction category' },
      { name: 'stamps_changed', type: 'INTEGER', isNullable: false, description: 'Signed integer (+1, +2, -1, etc.)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()', description: 'Audit timestamp' }
    ],
    uniqueConstraints: [],
    triggers: [
      'trg_process_stamp_transaction (AFTER INSERT -> fn_process_stamp_transaction)'
    ],
    rlsPolicies: [
      { command: 'SELECT', name: 'Allow staff to view transactions', role: 'merchant_staff', clause: 'tenant_id = get_auth_tenant_id()', rationale: 'Staff can review transaction history for their tenant.' },
      { command: 'INSERT', name: 'Allow staff to log transactions', role: 'merchant_staff', clause: 'tenant_id = get_auth_tenant_id() AND (staff_user_id IS NULL OR staff_user_id = auth.uid())', rationale: 'Only staff of the tenant can record stamps; automatically fires trigger.' },
      { command: 'UPDATE', name: 'Prohibit transaction modification', role: 'ALL', clause: 'FALSE', rationale: 'Ledger entries are strictly immutable. Fraud prevention invariant.' },
      { command: 'DELETE', name: 'Prohibit transaction deletion', role: 'ALL', clause: 'FALSE', rationale: 'Audit history cannot be deleted by anyone, ensuring complete financial trail.' }
    ]
  }
];
