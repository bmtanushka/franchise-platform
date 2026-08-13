import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { NewFranchiseeForm } from "@/components/dashboard/new-franchisee-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function NewFranchiseePage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={Building2} title="Add franchisee" />
      <NewFranchiseeForm />
    </div>
  );
}
