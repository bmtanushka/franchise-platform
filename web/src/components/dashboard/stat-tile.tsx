import { cardClass } from "@/lib/dashboard-ui";

export function StatTile({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`${cardClass} p-4`}>
      <div className="font-body text-xs text-slate">{label}</div>
      <div
        className={`font-heading mt-1 text-2xl font-bold tabular-nums ${emphasis ? "text-gold" : "text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}
