export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="text-xs opacity-60">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
