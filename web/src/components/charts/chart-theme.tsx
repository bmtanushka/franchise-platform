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
          --chart-surface: #ffffff;
          --text-secondary: #667169;
          --text-muted: #667169;
          --grid: #dee5e0;
          --trend: #2c7a5b;
          --tone-success: #22a35e;
          --tone-warning: #d97706;
          --tone-error: #dc2626;
          --tone-info: #2563eb;
          --tone-neutral: #667169;
          --cat-1: #2a78d6;
          --cat-2: #eb6834;
          --cat-3: #1baf7a;
          --cat-4: #eda100;
          --cat-5: #e87ba4;
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
