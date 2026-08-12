import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { listServiceProviders } from "@/lib/db/providers";
import { cardClass, primaryButtonClass } from "@/lib/dashboard-ui";

export default async function ProvidersPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const providers = await listServiceProviders(role);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ink">Service providers</h1>
        <Link href="/dashboard/providers/new" className={primaryButtonClass}>
          Add provider
        </Link>
      </div>
      {providers.length === 0 ? (
        <div className={`${cardClass} p-8 text-center`}>
          <p className="font-body text-sm text-slate">No service providers yet — add one to start assigning leads.</p>
        </div>
      ) : (
        <ul className={`${cardClass} divide-y divide-border`}>
          {providers.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 font-body text-sm">
              <span className="text-ink">{p.companyName}</span>
              <span className="text-slate">{p.serviceTypes.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
