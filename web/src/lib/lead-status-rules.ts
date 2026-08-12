import type { LeadStatus } from "@/lib/db/leads";

// Statuses a service_provider (and, mirroring that, a franchisor/super_admin
// acting as an admin override) can move a lead into directly. Kept separate
// from assigned_to_provider (needs a provider picked, see assignLeadToProvider)
// and the rebate statuses (see NEXT_REBATE_STATUS) which have their own rules.
export const PROVIDER_NEXT_STATUSES: LeadStatus[] = ["in_progress", "won", "lost", "disqualified"];

// won -> rebate_received -> rebate_paid, one step at a time, franchisor-only
// (see updateLeadStatus's REBATE_STATUSES guard in web/src/lib/db/leads.ts).
export const NEXT_REBATE_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  won: "rebate_received",
  rebate_received: "rebate_paid",
};
