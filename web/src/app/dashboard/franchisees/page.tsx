import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { listTenants } from "@/lib/db/tenants";
import { cardClass, primaryButtonClass, linkClass } from "@/lib/dashboard-ui";

export default async function FranchiseesPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const tenants = await listTenants();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ink">
          {role === "super_admin" ? "All tenants" : "Franchisees"}
        </h1>
        <Link href="/dashboard/franchisees/new" className={primaryButtonClass}>
          Add franchisee
        </Link>
      </div>
      <ul className={`${cardClass} divide-y divide-border`}>
        {tenants.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-3 font-body text-sm">
            <span className="text-ink">{t.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-slate">
                {t.type} · {t.slug} · {t.status}
              </span>
              {t.type === "franchisee" && (
                <Link href={`/dashboard/franchisees/${t.id}/edit`} className={linkClass}>
                  Edit
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
