import type { LeadStatus } from "@/lib/db/leads";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  qualified: "Qualified",
  assigned_to_provider: "Assigned",
  in_progress: "In progress",
  won: "Won",
  rebate_received: "Rebate received",
  rebate_paid: "Rebate paid",
  lost: "Lost",
  disqualified: "Disqualified",
};
