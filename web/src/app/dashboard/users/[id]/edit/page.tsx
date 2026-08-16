import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getAdminUserById } from "@/lib/db/users";
import { EditAdminUserForm } from "@/components/dashboard/edit-admin-user-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function EditAdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const user = await getAdminUserById(role, id);

  if (!user) {
    notFound();
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={Users} title={`Edit ${user.fullName ?? user.email}`} />
      <EditAdminUserForm user={user} isSelf={user.id === session!.user.id} />
    </div>
  );
}
