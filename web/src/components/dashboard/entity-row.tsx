function initialsOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function EntityRow({
  name,
  meta,
  status,
  action,
}: {
  name: string;
  meta?: string;
  status?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-sage-tint/60">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss font-heading text-sm font-semibold text-white">
        {initialsOf(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-body truncate text-sm font-medium text-ink">{name}</div>
        {meta && <div className="font-body truncate text-xs text-slate">{meta}</div>}
      </div>
      {status}
      {action}
    </li>
  );
}
