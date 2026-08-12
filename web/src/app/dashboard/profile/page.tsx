import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getFranchiseeProfile } from "@/lib/db/site-content";
import { getServiceProviderById } from "@/lib/db/providers";
import { cardClass, primaryButtonClass } from "@/lib/dashboard-ui";

export default async function ProfilePage() {
  const session = await auth();
  const { role, tenantId, providerId } = session!.user;

  if (role === "franchisee" && tenantId) {
    const profile = await getFranchiseeProfile(tenantId);
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-ink">Your site contact details</h1>
          <Link href="/dashboard/profile/edit" className={primaryButtonClass}>
            Edit
          </Link>
        </div>
        <dl className={`${cardClass} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 font-body text-sm`}>
          <dt className="text-slate">Phone</dt>
          <dd className="text-ink">{profile?.phone ?? "—"}</dd>
          <dt className="text-slate">Email</dt>
          <dd className="text-ink">{profile?.email ?? "—"}</dd>
          <dt className="text-slate">Address</dt>
          <dd className="text-ink">{profile?.address ?? "—"}</dd>
          <dt className="text-slate">Hours</dt>
          <dd className="text-ink">{profile?.businessHours ?? "—"}</dd>
        </dl>
        <p className="font-body text-xs text-slate">
          This tenant only ever sees its own leads, rebates, and profile — never another franchisee&apos;s.
        </p>
      </div>
    );
  }

  if (role === "service_provider" && providerId) {
    const provider = await getServiceProviderById(providerId);
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <h1 className="font-heading text-2xl font-bold text-ink">Your provider profile</h1>
        <dl className={`${cardClass} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 font-body text-sm`}>
          <dt className="text-slate">Company</dt>
          <dd className="text-ink">{provider?.companyName ?? "—"}</dd>
          <dt className="text-slate">Services</dt>
          <dd className="text-ink">{provider?.serviceTypes.join(", ") ?? "—"}</dd>
        </dl>
        <p className="font-body text-xs text-slate">
          You&apos;ll only ever see leads explicitly assigned to you here — not the full pipeline.
        </p>
      </div>
    );
  }

  redirect("/dashboard");
}
