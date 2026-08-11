-- ============================================================================
-- Migration 005: allow service providers to update their assigned leads
-- ============================================================================
-- 001_initial_schema.sql only granted service_provider SELECT on leads
-- (leads_provider_scoped, `for select`). The lead status pipeline needs
-- providers to update status/deal_value on leads assigned to them, so add
-- a matching UPDATE policy — scoped identically (assigned_provider_id must
-- match), with the same check on the resulting row so a provider can't
-- reassign a lead to someone else or move it to a different tenant.
-- ============================================================================

create policy leads_provider_update on leads
  for update
  using (
    current_setting('app.current_role', true) = 'service_provider'
    and assigned_provider_id::text = current_setting('app.current_provider_id', true)
  )
  with check (
    current_setting('app.current_role', true) = 'service_provider'
    and assigned_provider_id::text = current_setting('app.current_provider_id', true)
  );
