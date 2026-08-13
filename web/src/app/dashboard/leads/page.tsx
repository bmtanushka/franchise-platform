import { ListChecks } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadsSection } from "../leads-section";

export default async function LeadsPage() {
  const session = await auth();
  const { id, role, tenantId, providerId } = session!.user;

  return (
    <div className="w-full max-w-[1400px] space-y-6">
      <PageHeader icon={ListChecks} title="Leads" />
      <LeadsSection ctx={{ role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId: id }} />
    </div>
  );
}
