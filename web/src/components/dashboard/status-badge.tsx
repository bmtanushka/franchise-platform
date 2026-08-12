import { STATUS_LABEL } from "@/lib/lead-status-labels";
import type { LeadStatus } from "@/lib/db/leads";

// Maps every lead_status onto the style kit's 5 semantic status colors.
// The kit only names 5 explicit pairings (Won/In progress/Lost/New/
// Disqualified) for a simpler status set than our actual 9 — extended
// here by treating each DB status as one of those 5 *kinds* of state:
// still-pending (info), actively worked (warning), a positive outcome
// (success, covering won and both rebate stages), a negative outcome
// (error), or a dead end that isn't really "bad" (neutral).
export type StatusTone = "info" | "warning" | "success" | "error" | "neutral";

export const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  new: "info",
  qualified: "info",
  assigned_to_provider: "info",
  in_progress: "warning",
  won: "success",
  rebate_received: "success",
  rebate_paid: "success",
  lost: "error",
  disqualified: "neutral",
};

const TONE_CLASSES: Record<string, string> = {
  info: "bg-info-bg text-info-text",
  warning: "bg-warning-bg text-warning-text",
  success: "bg-success-bg text-success-text",
  error: "bg-error-bg text-error-text",
  neutral: "bg-neutral-bg text-neutral-text",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium font-body ${TONE_CLASSES[tone]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
