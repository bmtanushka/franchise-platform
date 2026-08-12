import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { listServiceTypes } from "@/lib/db/providers";
import { NewProviderForm } from "@/components/dashboard/new-provider-form";

export default async function NewProviderPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const serviceTypes = await listServiceTypes();

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Add service provider</h1>
      <NewProviderForm serviceTypes={serviceTypes} />
    </div>
  );
}
