import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { listLeadEntryServices } from "@/lib/db/lead-entry";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadEntryForm } from "@/components/dashboard/lead-entry-form";

export default async function NewLeadEntryPage() {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role !== "franchisee") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };
  const services = await listLeadEntryServices(ctx);

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader
        icon={UserPlus}
        title="Add a lead"
        description="For a caller who gave you their info over the phone — same questions as the chat widget."
      />
      <LeadEntryForm services={services} />
    </div>
  );
}
