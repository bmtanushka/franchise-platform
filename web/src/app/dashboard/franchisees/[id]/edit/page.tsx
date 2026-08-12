import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getTenantById } from "@/lib/db/tenants";
import { getFranchiseeProfile, listSiteTemplates } from "@/lib/db/site-content";
import { EditFranchiseeAdminForm } from "@/components/dashboard/edit-franchisee-admin-form";

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
    <div className="mx-auto w-full max-w-xl space-y-4">
      <h1 className="text-lg font-semibold">Edit {tenant.name}</h1>
      <EditFranchiseeAdminForm tenant={tenant} profile={profile} templates={templates} />
    </div>
  );
}
