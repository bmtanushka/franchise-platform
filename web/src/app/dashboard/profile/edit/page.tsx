import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getFranchiseeProfile, listSiteTemplates } from "@/lib/db/site-content";
import { getTenantById } from "@/lib/db/tenants";
import { EditOwnProfileForm } from "@/components/dashboard/edit-own-profile-form";

export default async function EditProfilePage() {
  const session = await auth();
  const { role, tenantId } = session!.user;

  if (role !== "franchisee" || !tenantId) {
    redirect("/dashboard/profile");
  }

  const [profile, templates, tenant] = await Promise.all([
    getFranchiseeProfile(tenantId),
    listSiteTemplates(),
    getTenantById(tenantId),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Edit your site</h1>
      <EditOwnProfileForm profile={profile} templates={templates} currentTemplateId={tenant?.templateId ?? null} />
    </div>
  );
}
