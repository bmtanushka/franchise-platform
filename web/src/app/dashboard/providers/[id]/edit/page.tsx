import { notFound, redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getServiceProviderById, listServiceTypes } from "@/lib/db/providers";
import { listUSStates } from "@/lib/us-locations";
import { EditProviderForm } from "@/components/dashboard/edit-provider-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function EditProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [provider, serviceTypes] = await Promise.all([getServiceProviderById(id), listServiceTypes()]);

  if (!provider) {
    notFound();
  }

  const states = listUSStates();

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={Briefcase} title={`Edit ${provider.companyName}`} />
      <EditProviderForm provider={provider} serviceTypes={serviceTypes} states={states} />
    </div>
  );
}
