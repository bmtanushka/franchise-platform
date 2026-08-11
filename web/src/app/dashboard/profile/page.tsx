import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getFranchiseeProfile } from "@/lib/db/site-content";
import { getServiceProviderById } from "@/lib/db/providers";

export default async function ProfilePage() {
  const session = await auth();
  const { role, tenantId, providerId } = session!.user;

  if (role === "franchisee" && tenantId) {
    const profile = await getFranchiseeProfile(tenantId);
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <h1 className="text-lg font-semibold">Your site contact details</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
          <dt className="opacity-60">Phone</dt>
          <dd>{profile?.phone ?? "—"}</dd>
          <dt className="opacity-60">Email</dt>
          <dd>{profile?.email ?? "—"}</dd>
          <dt className="opacity-60">Address</dt>
          <dd>{profile?.address ?? "—"}</dd>
          <dt className="opacity-60">Hours</dt>
          <dd>{profile?.businessHours ?? "—"}</dd>
        </dl>
        <p className="text-xs opacity-60">
          This tenant only ever sees its own leads, rebates, and profile — never another franchisee&apos;s.
        </p>
      </div>
    );
  }

  if (role === "service_provider" && providerId) {
    const provider = await getServiceProviderById(providerId);
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <h1 className="text-lg font-semibold">Your provider profile</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
          <dt className="opacity-60">Company</dt>
          <dd>{provider?.companyName ?? "—"}</dd>
          <dt className="opacity-60">Services</dt>
          <dd>{provider?.serviceTypes.join(", ") ?? "—"}</dd>
        </dl>
        <p className="text-xs opacity-60">
          You&apos;ll only ever see leads explicitly assigned to you here — not the full pipeline.
        </p>
      </div>
    );
  }

  redirect("/dashboard");
}
