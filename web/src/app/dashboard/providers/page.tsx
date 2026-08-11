import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { listServiceProviders } from "@/lib/db/providers";

export default async function ProvidersPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const providers = await listServiceProviders(role);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">Service providers</h1>
      {providers.length === 0 ? (
        <p className="text-sm opacity-60">No service providers yet.</p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
          {providers.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{p.companyName}</span>
              <span className="opacity-60">{p.serviceTypes.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
