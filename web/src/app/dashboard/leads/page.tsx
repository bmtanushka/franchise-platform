import { auth } from "@/lib/auth/config";
import { LeadsSection } from "../leads-section";

export default async function LeadsPage() {
  const session = await auth();
  const { id, role, tenantId, providerId } = session!.user;

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <h1 className="font-heading mb-4 text-2xl font-bold text-ink">Leads</h1>
      <LeadsSection ctx={{ role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId: id }} />
    </div>
  );
}
