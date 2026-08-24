import Link from "next/link";
import { ListChecks } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { PageHeader } from "@/components/dashboard/page-header";
import { primaryButtonClass } from "@/lib/dashboard-ui";
import { LeadsSection } from "../leads-section";

export default async function LeadsPage() {
  const session = await auth();
  const { id, role, tenantId, providerId } = session!.user;

  return (
    <div className="w-full max-w-[1400px] space-y-6">
      <PageHeader
        icon={ListChecks}
        title="Leads"
        action={
          role === "franchisee" ? (
            <Link href="/dashboard/leads/new" className={primaryButtonClass}>
              Add lead
            </Link>
          ) : undefined
        }
      />
      <LeadsSection ctx={{ role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId: id }} />
    </div>
  );
}
