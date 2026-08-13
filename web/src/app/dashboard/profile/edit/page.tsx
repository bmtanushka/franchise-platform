import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getFranchiseeProfile, listSiteTemplates } from "@/lib/db/site-content";
import { getTenantById } from "@/lib/db/tenants";
import { EditOwnProfileForm } from "@/components/dashboard/edit-own-profile-form";
import { PageHeader } from "@/components/dashboard/page-header";

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
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={UserCircle} title="Edit your site" />
      <EditOwnProfileForm profile={profile} templates={templates} currentTemplateId={tenant?.templateId ?? null} />
    </div>
  );
}
