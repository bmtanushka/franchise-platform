import Link from "next/link";
import { listLeads, type Lead, type LeadStatus } from "@/lib/db/leads";
import { listServiceProviders } from "@/lib/db/providers";
import { assignLeadAction, updateLeadStatusAction } from "@/lib/actions/leads";
import { STATUS_LABEL } from "@/lib/lead-status-labels";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cardClass, inputClass, secondaryButtonClass, linkClass } from "@/lib/dashboard-ui";
import type { Role } from "@/lib/db/context";
import type { SessionContext } from "@/lib/db/context";

const PROVIDER_NEXT_STATUSES: LeadStatus[] = ["in_progress", "won", "lost", "disqualified"];

// won -> rebate_received -> rebate_paid, franchisor-only (see leads.ts).
const NEXT_REBATE_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  won: "rebate_received",
  rebate_received: "rebate_paid",
};

const thClass = "px-4 py-3 text-left font-body text-xs font-semibold uppercase tracking-[0.03em] text-slate";
const tdClass = "px-4 py-3 align-middle font-body text-sm text-ink";

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
      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border bg-sage-tint">
              {(ctx.role === "super_admin" || ctx.role === "franchisor") && <th className={thClass}>Tenant</th>}
              <th className={thClass}>Service</th>
              <th className={thClass}>Contact</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Provider</th>
              <th className={`${thClass} text-right`}>Deal value</th>
              <th className={thClass}>Details</th>
              {ctx.role !== "franchisee" && <th className={thClass}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-sage-tint/60">
                {(ctx.role === "super_admin" || ctx.role === "franchisor") && (
                  <td className={tdClass}>{lead.tenantName}</td>
                )}
                <td className={tdClass}>{lead.serviceTypeLabel}</td>
                <td className={tdClass}>
                  <div>{lead.fullName ?? "—"}</div>
                  <div className="text-xs text-slate">{lead.contactEmail}</div>
                </td>
                <td className={tdClass}>
                  <StatusBadge status={lead.status} />
                </td>
                <td className={tdClass}>{lead.assignedProviderName ?? "—"}</td>
                <td className={`${tdClass} text-right font-medium tabular-nums ${lead.dealValue ? "text-gold" : "text-slate"}`}>
                  {lead.dealValue ? `$${lead.dealValue}` : "—"}
                </td>
                <td className={tdClass}>
                  <Link href={`/dashboard/leads/${lead.id}`} className={linkClass}>
                    View
                  </Link>
                </td>
                {ctx.role !== "franchisee" && (
                  <td className={tdClass}>
                    <div className="flex flex-col gap-1.5">
                      {(ctx.role === "super_admin" || ctx.role === "franchisor") &&
                        !lead.assignedProviderId && <AssignForm leadId={lead.id} providers={providers} />}
                      {ctx.role === "service_provider" && (
                        <UpdateStatusForm leadId={lead.id} currentStatus={lead.status} currentDealValue={lead.dealValue} />
                      )}
                      {(ctx.role === "super_admin" || ctx.role === "franchisor") &&
                        NEXT_REBATE_STATUS[lead.status] && (
                          <RebateAdvanceForm leadId={lead.id} nextStatus={NEXT_REBATE_STATUS[lead.status]!} />
                        )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

const compactSelectClass = `${inputClass} !w-auto !py-1 !text-xs`;
const compactInputClass = `${inputClass} !w-24 !py-1 !text-xs`;
const compactButtonClass = "rounded-md bg-forest px-2.5 py-1 text-xs font-medium text-white hover:bg-moss transition-colors font-body";

function AssignForm({
  leadId,
  providers,
}: {
  leadId: string;
  providers: { id: string; companyName: string; serviceTypes: string[] }[];
}) {
  return (
    <form action={assignLeadAction} className="flex gap-1.5">
      <input type="hidden" name="leadId" value={leadId} />
      <select name="providerId" required className={compactSelectClass}>
        <option value="">Assign to...</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.companyName}
          </option>
        ))}
      </select>
      <button type="submit" className={compactButtonClass}>
        Assign
      </button>
    </form>
  );
}

function UpdateStatusForm({
  leadId,
  currentStatus,
  currentDealValue,
}: {
  leadId: string;
  currentStatus: LeadStatus;
  currentDealValue: string | null;
}) {
  // Defaults the dropdown to the lead's current status (when it's one of
  // the provider-settable ones) so submitting to just update the deal
  // value doesn't silently regress e.g. "won" back to "in_progress" —
  // the select would otherwise default to whichever option is listed
  // first regardless of the lead's actual state.
  const defaultStatus = PROVIDER_NEXT_STATUSES.includes(currentStatus) ? currentStatus : "in_progress";

  return (
    <form action={updateLeadStatusAction} className="flex flex-wrap gap-1.5">
      <input type="hidden" name="leadId" value={leadId} />
      <select name="status" required defaultValue={defaultStatus} className={compactSelectClass}>
        {PROVIDER_NEXT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <input
        type="number"
        name="dealValue"
        placeholder="Deal value"
        step="0.01"
        defaultValue={currentDealValue ?? ""}
        className={compactInputClass}
      />
      <button type="submit" className={compactButtonClass}>
        Update
      </button>
    </form>
  );
}

function RebateAdvanceForm({ leadId, nextStatus }: { leadId: string; nextStatus: LeadStatus }) {
  return (
    <form action={updateLeadStatusAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button type="submit" className={`${secondaryButtonClass} !px-2 !py-1 !text-xs`}>
        Mark {STATUS_LABEL[nextStatus].toLowerCase()}
      </button>
    </form>
  );
}
