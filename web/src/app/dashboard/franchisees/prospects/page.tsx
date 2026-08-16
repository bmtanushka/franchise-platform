import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { listFranchiseProspects } from "@/lib/db/leads";
import { cardClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FranchiseProspectStatusSelect } from "@/components/dashboard/franchise-prospect-status-select";

export default async function FranchiseProspectsPage() {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };
  const prospects = await listFranchiseProspects(ctx);

  return (
    <div className={pageContainerClass}>
      <div>
        <Link href="/dashboard/franchisees" className={linkClass}>
          ← Back to franchisees
        </Link>
      </div>

      <PageHeader
        icon={UserPlus}
        title="Possible franchisees"
        description="People who expressed interest in opening a Luna Verde franchise through the corporate site's chat."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total inquiries" value={String(prospects.length)} />
      </div>

      {prospects.length === 0 ? (
        <div className={`${cardClass} p-6 text-center`}>
          <p className="font-body text-sm text-slate">No franchise inquiries yet.</p>
        </div>
      ) : (
        <ul className={`${cardClass} divide-y divide-border`}>
          {prospects.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="font-body truncate text-sm font-medium text-ink">{p.fullName ?? "Unnamed"}</div>
                <div className="font-body truncate text-xs text-slate">
                  {p.contactEmail ?? "—"} · {p.contactPhone ?? "—"}
                </div>
                {p.desiredLocation && (
                  <div className="font-body truncate text-xs text-slate">Wants to open in: {p.desiredLocation}</div>
                )}
              </div>
              <StatusBadge status={p.status} />
              <FranchiseProspectStatusSelect leadId={p.id} status={p.status} />
              <Link href={`/dashboard/leads/${p.id}`} className={`${linkClass} shrink-0`}>
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
