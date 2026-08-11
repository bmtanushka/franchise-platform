import { listLeads, type Lead, type LeadStatus } from "@/lib/db/leads";
import { listServiceProviders } from "@/lib/db/providers";
import { assignLeadAction, updateLeadStatusAction } from "@/lib/actions/leads";
import type { Role } from "@/lib/db/context";
import type { SessionContext } from "@/lib/db/context";

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  qualified: "Qualified",
  assigned_to_provider: "Assigned",
  in_progress: "In progress",
  won: "Won",
  lost: "Lost",
  disqualified: "Disqualified",
};

const PROVIDER_NEXT_STATUSES: LeadStatus[] = ["in_progress", "won", "lost", "disqualified"];

export async function LeadsSection({ ctx }: { ctx: SessionContext }) {
  const leads = await listLeads(ctx);
  const providers =
    ctx.role === "super_admin" || ctx.role === "franchisor" ? await listServiceProviders(ctx.role) : [];

  if (leads.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-medium opacity-70">{sectionTitle(ctx.role)}</h2>
        <p className="text-sm opacity-60">No leads yet.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium opacity-70">{sectionTitle(ctx.role)}</h2>
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left opacity-60 dark:border-white/15">
              {(ctx.role === "super_admin" || ctx.role === "franchisor") && <th className="px-3 py-2 font-medium">Tenant</th>}
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Provider</th>
              {ctx.role !== "franchisee" && <th className="px-3 py-2 font-medium">Action</th>}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                {(ctx.role === "super_admin" || ctx.role === "franchisor") && (
                  <td className="px-3 py-2">{lead.tenantName}</td>
                )}
                <td className="px-3 py-2">{lead.serviceTypeLabel}</td>
                <td className="px-3 py-2">
                  <div>{lead.fullName ?? "—"}</div>
                  <div className="text-xs opacity-60">{lead.contactEmail}</div>
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                    {STATUS_LABEL[lead.status]}
                  </span>
                  {lead.dealValue && <div className="mt-1 text-xs opacity-60">${lead.dealValue}</div>}
                </td>
                <td className="px-3 py-2">{lead.assignedProviderName ?? "—"}</td>
                {ctx.role !== "franchisee" && (
                  <td className="px-3 py-2">
                    {(ctx.role === "super_admin" || ctx.role === "franchisor") &&
                      !lead.assignedProviderId && <AssignForm leadId={lead.id} providers={providers} />}
                    {ctx.role === "service_provider" && (
                      <UpdateStatusForm leadId={lead.id} currentStatus={lead.status} currentDealValue={lead.dealValue} />
                    )}
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
      <select name="providerId" required className="rounded border border-black/15 bg-transparent px-1.5 py-1 text-xs dark:border-white/20">
        <option value="">Assign to...</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.companyName}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-black px-2 py-1 text-xs text-white dark:bg-white dark:text-black">
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
      <select
        name="status"
        required
        defaultValue={defaultStatus}
        className="rounded border border-black/15 bg-transparent px-1.5 py-1 text-xs dark:border-white/20"
      >
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
        className="w-24 rounded border border-black/15 bg-transparent px-1.5 py-1 text-xs dark:border-white/20"
      />
      <button type="submit" className="rounded bg-black px-2 py-1 text-xs text-white dark:bg-white dark:text-black">
        Update
      </button>
    </form>
  );
}
