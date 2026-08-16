-- ============================================================================
-- Migration 009: service areas for service providers, for franchisor/
-- super_admin to record which US states/cities a provider actually
-- covers. Stored as one jsonb array rather than a normalized table since
-- nothing queries it relationally yet (no area-based lead routing) —
-- each element is {"state": "VA", "stateName": "Virginia", "cities": [...]}.
-- ============================================================================

alter table service_providers add column if not exists service_areas jsonb not null default '[]';
