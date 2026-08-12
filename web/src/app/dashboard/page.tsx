import { auth } from "@/lib/auth/config";
import { getLeadAnalytics } from "@/lib/db/leads";
import { StatTile } from "@/components/dashboard/stat-tile";
import { cardClass } from "@/lib/dashboard-ui";
import { ChartTheme } from "@/components/charts/chart-theme";
import { StatusChart } from "@/components/charts/status-chart";
import { ServiceTypeChart } from "@/components/charts/service-type-chart";
import { TrendChart } from "@/components/charts/trend-chart";

function formatCurrency(value: string): string {
  const n = Number(value);
  if (n === 0) return "$0";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function OverviewPage() {
  const session = await auth();
  const { id, role, tenantId, providerId } = session!.user;

  const analytics = await getLeadAnalytics({
    role,
    tenantId: tenantId ?? null,
    providerId: providerId ?? null,
    userId: id,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <h1 className="font-heading text-2xl font-bold text-ink">Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total leads" value={String(analytics.totalLeads)} />
        <StatTile label="Won" value={String(analytics.wonCount)} />
        <StatTile label="Total deal value" value={formatCurrency(analytics.totalDealValueWon)} emphasis />
        <StatTile label="Active pipeline" value={String(analytics.activeCount)} />
      </div>

      {analytics.totalLeads === 0 ? (
        <p className="font-body text-sm text-slate">No leads yet — charts will populate once leads come in.</p>
      ) : (
        <ChartTheme>
          <div className="space-y-6">
            <section className="space-y-2">
              <h2 className="font-heading text-base font-semibold text-ink">Leads by status</h2>
              <div className={`${cardClass} p-4`}>
                <StatusChart data={analytics.byStatus} />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="space-y-2">
                <h2 className="font-heading text-base font-semibold text-ink">Leads by service</h2>
                <div className={`${cardClass} p-4`}>
                  <ServiceTypeChart data={analytics.byServiceType} />
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading text-base font-semibold text-ink">Leads, last 30 days</h2>
                <div className={`${cardClass} p-4`}>
                  <TrendChart data={analytics.last30Days} />
                </div>
              </section>
            </div>
          </div>
        </ChartTheme>
      )}
    </div>
  );
}
