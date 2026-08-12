import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { NewFranchiseeForm } from "@/components/dashboard/new-franchisee-form";

export default async function NewFranchiseePage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Add franchisee</h1>
      <NewFranchiseeForm />
    </div>
  );
}
