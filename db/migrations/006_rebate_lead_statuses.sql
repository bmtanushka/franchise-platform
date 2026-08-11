-- ============================================================================
-- Migration 006: two more lead statuses — rebate_received, rebate_paid
-- ============================================================================
-- Manual, franchisor-controlled tracking of the rebate lifecycle after a
-- deal is won: rebate_received (the franchise got the commission from the
-- lender/broker) and rebate_paid (the franchise paid the franchisee their
-- share). No automatic calculation — these are just two more states in
-- the same manually-driven pipeline as everything else.
--
-- ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a
-- statement that uses the new value, but is otherwise safe to run alone.
-- ============================================================================

alter type lead_status add value if not exists 'rebate_received' after 'won';
alter type lead_status add value if not exists 'rebate_paid' after 'rebate_received';
