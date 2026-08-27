import type { LucideIcon } from "lucide-react";

export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-moss/15 text-moss">
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">{title}</h1>
          {description && <p className="font-body mt-0.5 text-sm text-slate">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
