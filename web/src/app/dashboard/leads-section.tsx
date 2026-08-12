import { listLeads } from "@/lib/db/leads";
import { listServiceProviders } from "@/lib/db/providers";
import { LeadsViewSwitcher } from "@/components/dashboard/leads-view-switcher";
import { cardClass } from "@/lib/dashboard-ui";
import type { Role } from "@/lib/db/context";
import type { SessionContext } from "@/lib/db/context";

export async function LeadsSection({ ctx }: { ctx: SessionContext }) {
  const leads = await listLeads(ctx);
  const providers =
    ctx.role === "super_admin" || ctx.role === "franchisor" ? await listServiceProviders(ctx.role) : [];

  if (leads.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-ink">{sectionTitle(ctx.role)}</h2>
        <div className={`${cardClass} p-8 text-center`}>
          <p className="font-body text-sm text-slate">
            No leads yet — they&apos;ll show up here once the chat agent captures one.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-base font-semibold text-ink">{sectionTitle(ctx.role)}</h2>
      <LeadsViewSwitcher leads={leads} providers={providers} role={ctx.role} />
    </section>
  );
}

function sectionTitle(role: Role): string {
  switch (role) {
    case "super_admin":
    case "franchisor":
      return "All leads";
    case "franchisee":
      return "Your leads";
    case "service_provider":
      return "Leads assigned to you";
  }
}
