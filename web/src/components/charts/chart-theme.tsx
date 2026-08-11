// Shared color roles for the dashboard charts, following the dataviz
// skill's palette: an ordinal blue ramp for the lead pipeline (since
// status has a natural progression order, not just distinct identities),
// a reserved critical red for the two "exited" statuses, and the fixed
// categorical order for service type (identity, no inherent order).
// Both light and dark steps are defined so the SVG `fill="var(--x)"`
// values swap automatically with the OS theme — no separate render path.
export function ChartTheme({ children }: { children: React.ReactNode }) {
  return (
    <div className="viz-root">
      <style>{`
        .viz-root {
          --chart-surface: #fcfcfb;
          --text-secondary: #52514e;
          --text-muted: #898781;
          --grid: #e1e0d9;
          --pipeline-1: #86b6ef;
          --pipeline-2: #6da7ec;
          --pipeline-3: #5598e7;
          --pipeline-4: #3987e5;
          --pipeline-5: #2a78d6;
          --pipeline-6: #1c5cab;
          --pipeline-7: #104281;
          --status-critical: #d03b3b;
          --cat-1: #2a78d6;
          --cat-2: #eb6834;
          --cat-3: #1baf7a;
          --cat-4: #eda100;
          --cat-5: #e87ba4;
        }
        @media (prefers-color-scheme: dark) {
          .viz-root {
            --chart-surface: #1a1a19;
            --text-secondary: #c3c2b7;
            --text-muted: #898781;
            --grid: #2c2c2a;
            --pipeline-1: #86b6ef;
            --pipeline-2: #6da7ec;
            --pipeline-3: #5598e7;
            --pipeline-4: #3987e5;
            --pipeline-5: #2a78d6;
            --pipeline-6: #256abf;
            --pipeline-7: #184f95;
            --status-critical: #e66767;
            --cat-1: #3987e5;
            --cat-2: #d95926;
            --cat-3: #199e70;
            --cat-4: #c98500;
            --cat-5: #d55181;
          }
        }
      `}</style>
      {children}
    </div>
  );
}

// Pipeline stage order carries the ordinal ramp; lost/disqualified exit
// the ramp entirely and get the reserved critical color instead.
export const STATUS_COLOR_VAR: Record<string, string> = {
  new: "var(--pipeline-1)",
  qualified: "var(--pipeline-2)",
  assigned_to_provider: "var(--pipeline-3)",
  in_progress: "var(--pipeline-4)",
  won: "var(--pipeline-5)",
  rebate_received: "var(--pipeline-6)",
  rebate_paid: "var(--pipeline-7)",
  lost: "var(--status-critical)",
  disqualified: "var(--status-critical)",
};

export const CATEGORICAL_VARS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)"];
