import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { listAdminUsers } from "@/lib/db/users";
import { cardClass, primaryButtonClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityRow } from "@/components/dashboard/entity-row";
import { StatTile } from "@/components/dashboard/stat-tile";

const ROLE_LABEL: Record<"super_admin" | "franchisor", string> = {
  super_admin: "Super admin",
  franchisor: "Franchisor",
};

export default async function UsersPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin") {
    redirect("/dashboard");
  }

  const users = await listAdminUsers(role);
  const adminCount = users.filter((u) => u.role === "super_admin").length;
  const franchisorCount = users.filter((u) => u.role === "franchisor").length;

  return (
    <div className={pageContainerClass}>
      <PageHeader
        icon={Users}
        title="Users"
        description="Super admin and franchisor accounts — franchisees and providers are managed on their own pages."
        action={
          <Link href="/dashboard/users/new" className={primaryButtonClass}>
            Add user
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Super admins" value={String(adminCount)} />
        <StatTile label="Franchisors" value={String(franchisorCount)} />
      </div>

      {users.length === 0 ? (
        <div className={`${cardClass} p-8 text-center`}>
          <p className="font-body text-sm text-slate">No accounts yet.</p>
        </div>
      ) : (
        <ul className={`${cardClass} divide-y divide-border`}>
          {users.map((u) => (
            <EntityRow
              key={u.id}
              name={u.fullName ?? u.email}
              meta={`${ROLE_LABEL[u.role]} · ${u.email}`}
              action={
                <Link href={`/dashboard/users/${u.id}/edit`} className={`${linkClass} ml-2`}>
                  Edit
                </Link>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
