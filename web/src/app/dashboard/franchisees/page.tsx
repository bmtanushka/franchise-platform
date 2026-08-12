import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { listTenants } from "@/lib/db/tenants";

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
        <h1 className="text-lg font-semibold">{role === "super_admin" ? "All tenants" : "Franchisees"}</h1>
        <Link
          href="/dashboard/franchisees/new"
          className="rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
        >
          Add franchisee
        </Link>
      </div>
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
        {tenants.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{t.name}</span>
            <span className="opacity-60">
              {t.type} · {t.slug} · {t.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
