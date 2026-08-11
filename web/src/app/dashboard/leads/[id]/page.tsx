import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getLeadDetail } from "@/lib/db/leads";
import { STATUS_LABEL } from "@/lib/lead-status-labels";

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
        <Link href="/dashboard/leads" className="text-sm opacity-60 hover:opacity-100">
          ← Back to leads
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-semibold">{lead.fullName ?? "Lead"}</h1>
        <p className="text-sm opacity-70">
          {lead.serviceTypeLabel} · {lead.tenantName}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium opacity-70">Status</h2>
        <div className="flex items-center gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">
            {STATUS_LABEL[lead.status]}
          </span>
          {lead.dealValue && <span className="text-sm opacity-70">Deal value: ${lead.dealValue}</span>}
          {lead.assignedProviderName && (
            <span className="text-sm opacity-70">Provider: {lead.assignedProviderName}</span>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium opacity-70">Contact details</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
          <dt className="opacity-60">Name</dt>
          <dd>{prettifyValue(lead.fullName)}</dd>
          <dt className="opacity-60">Email</dt>
          <dd>{prettifyValue(lead.contactEmail)}</dd>
          <dt className="opacity-60">Phone</dt>
          <dd>{prettifyValue(lead.contactPhone)}</dd>
          <dt className="opacity-60">Postcode</dt>
          <dd>{prettifyValue(lead.postcode)}</dd>
          <dt className="opacity-60">Consent to contact</dt>
          <dd>{prettifyValue(lead.consentToContact)}</dd>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium opacity-70">Collected details</h2>
        {detailEntries.length === 0 ? (
          <p className="text-sm opacity-60">No additional details collected.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
            {detailEntries.map(([key, value]) => (
              <div className="contents" key={key}>
                <dt className="opacity-60">{prettifyKey(key)}</dt>
                <dd>{prettifyValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium opacity-70">Status history</h2>
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
          {lead.statusHistory.map((entry, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                  {STATUS_LABEL[entry.status]}
                </span>
                {entry.note && <span className="ml-2 opacity-70">{entry.note}</span>}
              </div>
              <div className="text-xs opacity-60">
                {entry.changedByName ?? "System"} · {new Date(entry.changedAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
