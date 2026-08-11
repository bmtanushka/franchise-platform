import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { listTenants } from "@/lib/db/tenants";
import { getFranchiseeProfile } from "@/lib/db/site-content";
import { getServiceProviderById } from "@/lib/db/providers";
import { SignOutButton } from "./sign-out-button";
import { LeadsSection } from "./leads-section";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id, role, tenantId, providerId, name, email } = session.user;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm opacity-70">
            {name ?? email} — <span className="font-mono">{role}</span>
          </p>
        </div>
        <SignOutButton />
      </div>

      {(role === "super_admin" || role === "franchisor") && <AllTenantsView role={role} />}
      {role === "franchisee" && tenantId && <FranchiseeView tenantId={tenantId} />}
      {role === "service_provider" && providerId && <ProviderView providerId={providerId} />}

      <LeadsSection ctx={{ role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId: id }} />
    </main>
  );
}

async function AllTenantsView({ role }: { role: string }) {
  const tenants = await listTenants();

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium opacity-70">
        {role === "super_admin" ? "All tenants (super_admin scope)" : "All franchisees (franchisor scope)"}
      </h2>
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
    </section>
  );
}

async function FranchiseeView({ tenantId }: { tenantId: string }) {
  const profile = await getFranchiseeProfile(tenantId);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium opacity-70">Your site contact details</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
        <dt className="opacity-60">Phone</dt>
        <dd>{profile?.phone ?? "—"}</dd>
        <dt className="opacity-60">Email</dt>
        <dd>{profile?.email ?? "—"}</dd>
        <dt className="opacity-60">Address</dt>
        <dd>{profile?.address ?? "—"}</dd>
        <dt className="opacity-60">Hours</dt>
        <dd>{profile?.businessHours ?? "—"}</dd>
      </dl>
      <p className="text-xs opacity-60">
        This tenant only ever sees its own leads, rebates, and profile — never another franchisee&apos;s.
      </p>
    </section>
  );
}

async function ProviderView({ providerId }: { providerId: string }) {
  const provider = await getServiceProviderById(providerId);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium opacity-70">Your provider profile</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
        <dt className="opacity-60">Company</dt>
        <dd>{provider?.companyName ?? "—"}</dd>
        <dt className="opacity-60">Services</dt>
        <dd>{provider?.serviceTypes.join(", ") ?? "—"}</dd>
      </dl>
      <p className="text-xs opacity-60">
        You&apos;ll only ever see leads explicitly assigned to you here — not the full pipeline.
      </p>
    </section>
  );
}
