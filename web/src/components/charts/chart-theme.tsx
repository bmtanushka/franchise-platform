// Shared color roles for the dashboard charts. Chart chrome (surface,
// grid, text) matches the dashboard style kit's surface/border/slate
// tokens. Status colors reuse the exact same 5-tone mapping as
// StatusBadge (STATUS_TONE) so a "Won" bar and a "Won" pill never
// disagree. Service-type colors are a separate concern — no inherent
// order between services, and none of the 5 semantic status hues are
// reused there, so the dataviz-validated categorical set stays as-is.
import { STATUS_TONE, type StatusTone } from "@/components/dashboard/status-badge";
import type { LeadStatus } from "@/lib/db/leads";

export function ChartTheme({ children }: { children: React.ReactNode }) {
  return (
    <div className="viz-root">
      <style>{`
        .viz-root {
          --chart-surface: #141b24;
          --text-secondary: #8b96a8;
          --text-muted: #8b96a8;
          --grid: #333f4d;
          --trend: #0e9f6e;
          --tone-success: #22c55e;
          --tone-warning: #f5a524;
          --tone-error: #f0575c;
          --tone-info: #4f8ff7;
          --tone-neutral: #8b96a8;
          --cat-1: #5b9bf0;
          --cat-2: #ff8a52;
          --cat-3: #2cd39a;
          --cat-4: #ffbe3d;
          --cat-5: #ff9dc2;
        }
      `}</style>
      {children}
    </div>
  );
}

const TONE_VAR: Record<StatusTone, string> = {
  info: "var(--tone-info)",
  warning: "var(--tone-warning)",
  success: "var(--tone-success)",
  error: "var(--tone-error)",
  neutral: "var(--tone-neutral)",
};

export const STATUS_COLOR_VAR: Record<LeadStatus, string> = Object.fromEntries(
  Object.entries(STATUS_TONE).map(([status, tone]) => [status, TONE_VAR[tone]]),
) as Record<LeadStatus, string>;

export const CATEGORICAL_VARS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)"];
