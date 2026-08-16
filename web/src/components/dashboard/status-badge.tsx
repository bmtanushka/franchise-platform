import { STATUS_LABEL } from "@/lib/lead-status-labels";
import type { LeadStatus } from "@/lib/db/leads";
import type { CourseStatus } from "@/lib/db/courses";

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

export const TONE_CLASSES: Record<StatusTone, string> = {
  info: "bg-info-bg text-info-text",
  warning: "bg-warning-bg text-warning-text",
  success: "bg-success-bg text-success-text",
  error: "bg-error-bg text-error-text",
  neutral: "bg-neutral-bg text-neutral-text",
};

export function TonePill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-medium font-body ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <TonePill tone={STATUS_TONE[status]} label={STATUS_LABEL[status]} />;
}

export type TenantStatus = "active" | "onboarding" | "suspended";

export const TENANT_STATUS_TONE: Record<TenantStatus, StatusTone> = {
  active: "success",
  onboarding: "info",
  suspended: "neutral",
};

const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  active: "Active",
  onboarding: "Onboarding",
  suspended: "Suspended",
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return <TonePill tone={TENANT_STATUS_TONE[status]} label={TENANT_STATUS_LABEL[status]} />;
}

const COURSE_STATUS_TONE: Record<CourseStatus, StatusTone> = {
  draft: "neutral",
  published: "success",
};

const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "Draft",
  published: "Published",
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <TonePill tone={COURSE_STATUS_TONE[status]} label={COURSE_STATUS_LABEL[status]} />;
}
