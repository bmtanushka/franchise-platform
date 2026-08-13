import { notFound, redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getTenantById } from "@/lib/db/tenants";
import { getFranchiseeProfile, listSiteTemplates } from "@/lib/db/site-content";
import { EditFranchiseeAdminForm } from "@/components/dashboard/edit-franchisee-admin-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function EditFranchiseePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const tenant = await getTenantById(id);

  if (!tenant || tenant.type !== "franchisee") {
    notFound();
  }

  const [profile, templates] = await Promise.all([getFranchiseeProfile(id), listSiteTemplates()]);

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={Building2} title={`Edit ${tenant.name}`} />
      <EditFranchiseeAdminForm tenant={tenant} profile={profile} templates={templates} />
    </div>
  );
}
