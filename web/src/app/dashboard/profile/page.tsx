import Link from "next/link";
import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getFranchiseeProfile } from "@/lib/db/site-content";
import { getServiceProviderById } from "@/lib/db/providers";
import { cardClass, primaryButtonClass } from "@/lib/dashboard-ui";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { PageHeader } from "@/components/dashboard/page-header";

function PasswordSection() {
  return (
    <section className="space-y-3 pt-4">
      <h2 className="font-heading text-lg font-bold text-ink">Change password</h2>
      <ChangePasswordForm />
    </section>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  const { role, tenantId, providerId, email } = session!.user;

  if (role === "franchisee" && tenantId) {
    const profile = await getFranchiseeProfile(tenantId);
    return (
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-4">
          <PageHeader
            icon={UserCircle}
            title="Your site contact details"
            action={
              <Link href="/dashboard/profile/edit" className={primaryButtonClass}>
                Edit
              </Link>
            }
          />
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
        <PasswordSection />
      </div>
    );
  }

  if (role === "service_provider" && providerId) {
    const provider = await getServiceProviderById(providerId);
    return (
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-4">
          <PageHeader icon={UserCircle} title="Your provider profile" />
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
        <PasswordSection />
      </div>
    );
  }

  if (role === "super_admin" || role === "franchisor") {
    return (
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-4">
          <PageHeader icon={UserCircle} title="Your account" />
          <dl className={`${cardClass} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 font-body text-sm`}>
            <dt className="text-slate">Email</dt>
            <dd className="text-ink">{email}</dd>
            <dt className="text-slate">Role</dt>
            <dd className="text-ink">{role === "super_admin" ? "Super admin" : "Franchisor"}</dd>
          </dl>
        </div>
        <PasswordSection />
      </div>
    );
  }

  redirect("/dashboard");
}
