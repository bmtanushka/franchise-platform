import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getLeadDetail } from "@/lib/db/leads";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cardClass, linkClass } from "@/lib/dashboard-ui";

function prettifyKey(key: string): string {
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function prettifyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const lead = await getLeadDetail(
    {
      role: session.user.role,
      tenantId: session.user.tenantId,
      providerId: session.user.providerId ?? null,
      userId: session.user.id,
    },
    id,
  );

  if (!lead) {
    notFound();
  }

  const detailEntries = Object.entries(lead.details).filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <Link href="/dashboard/leads" className={linkClass}>
          ← Back to leads
        </Link>
      </div>

      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">{lead.fullName ?? "Lead"}</h1>
        <p className="font-body text-sm text-slate">
          {lead.serviceTypeLabel} · {lead.tenantName}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-ink">Status</h2>
        <div className={`${cardClass} flex items-center gap-3 p-4`}>
          <StatusBadge status={lead.status} />
          {lead.dealValue && (
            <span className="font-body text-sm text-slate">
              Deal value: <span className="font-medium tabular-nums text-gold">${lead.dealValue}</span>
            </span>
          )}
          {lead.assignedProviderName && (
            <span className="font-body text-sm text-slate">Provider: {lead.assignedProviderName}</span>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-ink">Contact details</h2>
        <dl className={`${cardClass} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 font-body text-sm`}>
          <dt className="text-slate">Name</dt>
          <dd className="text-ink">{prettifyValue(lead.fullName)}</dd>
          <dt className="text-slate">Email</dt>
          <dd className="text-ink">{prettifyValue(lead.contactEmail)}</dd>
          <dt className="text-slate">Phone</dt>
          <dd className="text-ink">{prettifyValue(lead.contactPhone)}</dd>
          <dt className="text-slate">Postcode</dt>
          <dd className="text-ink">{prettifyValue(lead.postcode)}</dd>
          <dt className="text-slate">Consent to contact</dt>
          <dd className="text-ink">{prettifyValue(lead.consentToContact)}</dd>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-ink">Collected details</h2>
        {detailEntries.length === 0 ? (
          <p className="font-body text-sm text-slate">No additional details were collected for this lead.</p>
        ) : (
          <dl className={`${cardClass} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 font-body text-sm`}>
            {detailEntries.map(([key, value]) => (
              <div className="contents" key={key}>
                <dt className="text-slate">{prettifyKey(key)}</dt>
                <dd className="text-ink">{prettifyValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-ink">Status history</h2>
        <ul className={`${cardClass} divide-y divide-border`}>
          {lead.statusHistory.map((entry, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3 font-body text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={entry.status} />
                {entry.note && <span className="text-slate">{entry.note}</span>}
              </div>
              <div className="text-xs text-slate">
                {entry.changedByName ?? "System"} · {new Date(entry.changedAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
