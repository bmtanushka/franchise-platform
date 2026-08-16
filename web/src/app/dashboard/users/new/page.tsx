import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { NewAdminUserForm } from "@/components/dashboard/new-admin-user-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function NewAdminUserPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={Users} title="Add user" />
      <NewAdminUserForm />
    </div>
  );
}
