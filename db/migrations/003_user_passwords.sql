-- ============================================================================
-- Migration 003: password-based credentials for users
-- ============================================================================
-- The initial schema anticipated an OAuth-style provider (`auth_provider_id`,
-- for Auth.js/Clerk). For the credentials-based login flow (NextAuth
-- Credentials provider), users need a locally-stored password hash.
-- ============================================================================

alter table users add column if not exists password_hash text;
