-- ============================================================================
-- Migration 004: durable working state for the chat agent's question flow
-- ============================================================================
-- The agent reconstructs "which question is next" from the count of user
-- messages already received (stateless per-request, safe across restarts
-- and multiple instances), but it still needs somewhere durable to
-- accumulate the *structured* extracted values as the conversation
-- progresses (chat_messages only holds raw text). This column is that
-- accumulator; it's cleared/unused once the session completes and a lead
-- has been created.
-- ============================================================================

alter table chat_sessions add column if not exists collected_answers jsonb not null default '{}'::jsonb;
