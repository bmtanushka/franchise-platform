import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { listTenants } from "@/lib/db/tenants";
import { cardClass, primaryButtonClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityRow } from "@/components/dashboard/entity-row";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TenantStatusBadge } from "@/components/dashboard/status-badge";

export default async function FranchiseesPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const tenants = await listTenants();
  const franchiseeCount = tenants.filter((t) => t.type === "franchisee").length;
  const activeCount = tenants.filter((t) => t.type === "franchisee" && t.status === "active").length;

  return (
    <div className={pageContainerClass}>
      <PageHeader
        icon={Building2}
        title={role === "super_admin" ? "All tenants" : "Franchisees"}
        description="Every franchisee tenant, plus the franchisor's own root site."
        action={
          <Link href="/dashboard/franchisees/new" className={primaryButtonClass}>
            Add franchisee
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Franchisees" value={String(franchiseeCount)} />
        <StatTile label="Active" value={String(activeCount)} />
      </div>

      <Link
        href="/dashboard/franchisees/prospects"
        className={`${cardClass} flex items-center justify-between p-4 transition-colors hover:bg-sage-tint/60`}
      >
        <span className="font-body text-sm text-ink">Possible franchisees — people who inquired about opening one</span>
        <span className={linkClass}>View →</span>
      </Link>

      <ul className={`${cardClass} divide-y divide-border`}>
        {tenants.map((t) => (
          <EntityRow
            key={t.id}
            name={t.name}
            meta={`${t.type === "franchisor" ? "Franchisor" : "Franchisee"} · ${t.slug}`}
            status={t.type === "franchisee" ? <TenantStatusBadge status={t.status} /> : undefined}
            action={
              t.type === "franchisee" && (
                <Link href={`/dashboard/franchisees/${t.id}/edit`} className={`${linkClass} ml-2`}>
                  Edit
                </Link>
              )
            }
          />
        ))}
      </ul>
    </div>
  );
}
