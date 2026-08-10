-- ============================================================================
-- Franchise Lead-Gen Platform — Initial Schema
-- Target: Railway Postgres
-- ============================================================================
-- Enforcement strategy: primary authorization lives in the app's data-access
-- layer (every query goes through role/tenant-scoped functions — this is the
-- pattern to enforce consistently when vibe-coding, since it's what an AI
-- assistant can follow reliably across sessions). RLS policies below are
-- added as defense-in-depth on the most sensitive tables (leads, rebates,
-- chat_messages, documents later) so a bug in the app layer can't leak data
-- across tenants. See notes at the bottom for how to wire RLS in from Node.
-- ============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- TENANTS
-- ----------------------------------------------------------------------------
-- 'franchisor' = exactly one row, the root organisation.
-- 'franchisee' = one row per location/site.
create type tenant_type as enum ('franchisor', 'franchisee');
create type tenant_status as enum ('active', 'suspended', 'onboarding');

create table tenants (
  id            uuid primary key default gen_random_uuid(),
  type          tenant_type not null,
  slug          text not null unique,          -- used for *.franchiseenetwork.com subdomain
  name          text not null,
  status        tenant_status not null default 'onboarding',
  template_id   uuid,                          -- FK to site_templates, added below
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- DOMAINS — maps every hostname the app might receive to a tenant
-- ----------------------------------------------------------------------------
create type domain_type as enum ('root', 'subdomain', 'custom');

create table domains (
  id            uuid primary key default gen_random_uuid(),
  domain        text not null unique,           -- e.g. 'london.franchiseenetwork.com'
  tenant_id     uuid not null references tenants(id) on delete cascade,
  domain_type   domain_type not null,
  verified      boolean not null default false, -- true once DNS + Railway registration confirmed
  created_at    timestamptz not null default now()
);

create index idx_domains_tenant on domains(tenant_id);

-- ----------------------------------------------------------------------------
-- SITE TEMPLATES — presentation only; all templates read the same content model
-- ----------------------------------------------------------------------------
create table site_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                  -- 'Standard', 'Modern', 'Custom - Acme Mortgages'
  component_key text not null,                  -- maps to a React component in the app
  is_custom     boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table tenants
  add constraint fk_tenants_template foreign key (template_id) references site_templates(id);

-- ----------------------------------------------------------------------------
-- USERS & ROLES
-- ----------------------------------------------------------------------------
create type user_role as enum ('super_admin', 'franchisor', 'franchisee', 'service_provider');

create table users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  auth_provider_id text,                        -- e.g. Auth.js/Clerk subject id
  role            user_role not null,
  tenant_id       uuid references tenants(id) on delete cascade, -- null for super_admin
  full_name       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_users_tenant on users(tenant_id);

-- Service providers can be linked to more than one franchisee's leads over
-- time, so they get their own profile row separate from tenant scoping.
create table service_providers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references users(id) on delete cascade,
  company_name    text not null,
  service_types   text[] not null default '{}', -- keys from service_types.key
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SITE CONTENT — template + override model
-- ----------------------------------------------------------------------------
-- tenant_id null = franchisor's global default content.
-- A franchisee row with a matching section_key overrides that section.
create table site_content (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) on delete cascade, -- null = global default
  section_key   text not null,                  -- 'hero', 'services_intro', 'testimonials', etc
  content       jsonb not null,
  updated_at    timestamptz not null default now(),
  unique (tenant_id, section_key)
);

-- Franchisee-editable contact fields ONLY. This table is intentionally
-- narrow — franchisees get a data-access function that can touch these
-- columns and nothing else. Do not add marketing/legal copy fields here.
create table franchisee_profile (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  phone           text,
  email           text,
  address         text,
  business_hours  text,
  local_blurb     text,                         -- short optional local description
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SERVICE TYPES — the 5 fixed offerings
-- ----------------------------------------------------------------------------
create table service_types (
  id      uuid primary key default gen_random_uuid(),
  key     text not null unique,                 -- 'credit', 'mortgage', 'real_estate', 'foreign_national_credit', 'business_credit'
  name    text not null
);

insert into service_types (key, name) values
  ('credit', 'Credit facilities'),
  ('mortgage', 'Mortgage'),
  ('real_estate', 'Real estate'),
  ('foreign_national_credit', 'Foreign national credit facility'),
  ('business_credit', 'Business credit');

-- ----------------------------------------------------------------------------
-- CHAT SESSIONS & MESSAGES — full history, kept regardless of conversion
-- ----------------------------------------------------------------------------
create type chat_session_status as enum ('active', 'completed', 'abandoned');

create table chat_sessions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade, -- which franchisee site
  service_type_id uuid references service_types(id),
  status          chat_session_status not null default 'active',
  lead_id         uuid,                         -- set once qualified; FK added after leads table
  started_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create type chat_role as enum ('user', 'assistant');

create table chat_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references chat_sessions(id) on delete cascade,
  role         chat_role not null,
  content      text not null,
  created_at   timestamptz not null default now()
);

create index idx_chat_messages_session on chat_messages(session_id, created_at);

-- ----------------------------------------------------------------------------
-- LEADS
-- ----------------------------------------------------------------------------
create type lead_status as enum (
  'new', 'qualified', 'assigned_to_provider', 'in_progress', 'won', 'lost', 'disqualified'
);

create table leads (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade, -- capturing franchisee
  service_type_id     uuid not null references service_types(id),
  status              lead_status not null default 'new',
  assigned_provider_id uuid references service_providers(id),
  full_name           text,
  contact_email       text,
  contact_phone       text,
  consent_to_contact  boolean not null default false,
  details             jsonb not null default '{}', -- service-specific structured answers
  deal_value          numeric(12,2),
  source_session_id   uuid references chat_sessions(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_leads_tenant on leads(tenant_id);
create index idx_leads_provider on leads(assigned_provider_id);
create index idx_leads_status on leads(status);

alter table chat_sessions
  add constraint fk_chat_sessions_lead foreign key (lead_id) references leads(id);

create table lead_status_history (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads(id) on delete cascade,
  status       lead_status not null,
  changed_by   uuid references users(id),
  note         text,
  changed_at   timestamptz not null default now()
);

create index idx_lead_status_history_lead on lead_status_history(lead_id);

-- ----------------------------------------------------------------------------
-- REBATES
-- ----------------------------------------------------------------------------
create type rebate_rate_type as enum ('percentage', 'fixed');
create type payout_status as enum ('pending', 'paid');

create table rebate_rules (
  id              uuid primary key default gen_random_uuid(),
  service_type_id uuid not null references service_types(id),
  tenant_id       uuid references tenants(id), -- null = franchisor default rule for this service
  rate_type       rebate_rate_type not null,
  rate_value      numeric(10,4) not null,       -- percentage as e.g. 0.0050 for 0.5%, or fixed amount
  created_at      timestamptz not null default now()
);

create table rebates (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null unique references leads(id) on delete cascade,
  franchisee_tenant_id uuid not null references tenants(id),
  amount              numeric(12,2) not null,
  payout_status       payout_status not null default 'pending',
  calculated_at       timestamptz not null default now(),
  paid_at             timestamptz
);

create index idx_rebates_tenant on rebates(franchisee_tenant_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (defense-in-depth on the most sensitive tables)
-- ============================================================================
-- Wire-up from Node: wrap each request in a transaction and run, before any
-- query:
--   select set_config('app.current_tenant_id', $1, true);
--   select set_config('app.current_role', $2, true);
-- ($1/$2 come from the verified session, never from client input.)

alter table leads enable row level security;
alter table chat_messages enable row level security;
alter table rebates enable row level security;

-- super_admin and franchisor roles bypass tenant scoping entirely
create policy leads_full_access on leads
  for all
  using (current_setting('app.current_role', true) in ('super_admin', 'franchisor'));

create policy leads_tenant_scoped on leads
  for all
  using (
    current_setting('app.current_role', true) = 'franchisee'
    and tenant_id::text = current_setting('app.current_tenant_id', true)
  );

create policy leads_provider_scoped on leads
  for select
  using (
    current_setting('app.current_role', true) = 'service_provider'
    and assigned_provider_id::text = current_setting('app.current_provider_id', true)
  );

create policy chat_messages_admin on chat_messages
  for all
  using (current_setting('app.current_role', true) in ('super_admin', 'franchisor'));

create policy chat_messages_tenant_scoped on chat_messages
  for select
  using (
    current_setting('app.current_role', true) = 'franchisee'
    and session_id in (
      select id from chat_sessions
      where tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );

create policy rebates_admin on rebates
  for all
  using (current_setting('app.current_role', true) in ('super_admin', 'franchisor'));

create policy rebates_tenant_scoped on rebates
  for select
  using (
    current_setting('app.current_role', true) = 'franchisee'
    and franchisee_tenant_id::text = current_setting('app.current_tenant_id', true)
  );

-- ============================================================================
-- SEED: franchisor root tenant + default template
-- ============================================================================
insert into site_templates (name, component_key, is_custom)
values ('Standard', 'standard', false);

insert into tenants (type, slug, name, status, template_id)
select 'franchisor', 'root', 'Franchisor', 'active', id
from site_templates where component_key = 'standard';
