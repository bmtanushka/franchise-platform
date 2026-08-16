import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { listServiceProviders } from "@/lib/db/providers";
import { cardClass, primaryButtonClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityRow } from "@/components/dashboard/entity-row";
import { StatTile } from "@/components/dashboard/stat-tile";

export default async function ProvidersPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const providers = await listServiceProviders(role);

  return (
    <div className={pageContainerClass}>
      <PageHeader
        icon={Briefcase}
        title="Service providers"
        description="Everyone leads can be assigned to across all franchisees."
        action={
          <Link href="/dashboard/providers/new" className={primaryButtonClass}>
            Add provider
          </Link>
        }
      />

      {providers.length === 0 ? (
        <div className={`${cardClass} p-8 text-center`}>
          <p className="font-body text-sm text-slate">No service providers yet — add one to start assigning leads.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Providers" value={String(providers.length)} />
          </div>
          <ul className={`${cardClass} divide-y divide-border`}>
            {providers.map((p) => (
              <EntityRow
                key={p.id}
                name={p.companyName}
                meta={
                  p.serviceAreas.length > 0
                    ? `${p.serviceTypes.join(", ")} · ${p.serviceAreas.length} service area${p.serviceAreas.length === 1 ? "" : "s"}`
                    : p.serviceTypes.join(", ")
                }
                action={
                  <Link href={`/dashboard/providers/${p.id}/edit`} className={`${linkClass} ml-2`}>
                    Edit
                  </Link>
                }
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
