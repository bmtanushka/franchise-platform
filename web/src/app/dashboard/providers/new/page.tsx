import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { listServiceTypes } from "@/lib/db/providers";
import { NewProviderForm } from "@/components/dashboard/new-provider-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function NewProviderPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const serviceTypes = await listServiceTypes();

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={Briefcase} title="Add service provider" />
      <NewProviderForm serviceTypes={serviceTypes} />
    </div>
  );
}
