-- ============================================================================
-- Migration 002: franchisor site can also capture leads via the chat agent
-- ============================================================================
-- Rationale: franchisor-site leads are NOT routed to a franchisee. The
-- franchisor owns them outright, area or not, and assigns them directly to
-- a service provider in the relevant area, following up the same way a
-- franchisee would for their own leads. Because the franchisor already
-- exists as a row in `tenants` (type = 'franchisor'), no schema change is
-- needed to let leads.tenant_id point at the franchisor — it's just another
-- tenant. The only behavioural difference is in the rebate calculation:
-- a rebate is only ever created when the lead's owning tenant is type
-- 'franchisee', never 'franchisor'.
-- ============================================================================

-- Lightweight routing field — lets the franchisor filter/search their own
-- leads by area when deciding which service provider to assign them to.
-- Proximity matching can stay manual for v1 and get automated later without
-- a schema change.
alter table leads add column if not exists postcode text;

-- ----------------------------------------------------------------------------
-- Rebate calculation guard (enforce in the app-layer function that runs on
-- lead status -> 'won', not as a DB constraint, since it needs a join):
--
--   select t.type from tenants t where t.id = (select tenant_id from leads where id = $1);
--   -- only insert into rebates if t.type = 'franchisee'
--
-- Franchisor-owned leads that reach 'won' still get their full status
-- history and deal_value recorded on the lead itself — they just never
-- produce a rebates row, since no franchisee was involved.
-- ----------------------------------------------------------------------------

-- No RLS changes needed: leads_tenant_scoped already scopes by tenant_id,
-- and a franchisor-owned lead is only visible to super_admin/franchisor via
-- leads_full_access, which is correct — franchisees should never see leads
-- the franchisor is handling directly.
