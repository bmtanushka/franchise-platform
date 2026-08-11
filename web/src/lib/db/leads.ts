import { withTenantContext, SessionContext } from "./context";

export type LeadStatus =
  | "new"
  | "qualified"
  | "assigned_to_provider"
  | "in_progress"
  | "won"
  | "rebate_received"
  | "rebate_paid"
  | "lost"
  | "disqualified";

export type Lead = {
  id: string;
  tenantId: string;
  tenantName: string;
  serviceTypeKey: string;
  serviceTypeLabel: string;
  status: LeadStatus;
  assignedProviderId: string | null;
  assignedProviderName: string | null;
  fullName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  postcode: string | null;
  dealValue: string | null;
  createdAt: string;
};

type LeadRow = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  service_type_key: string;
  service_type_label: string;
  status: LeadStatus;
  assigned_provider_id: string | null;
  assigned_provider_name: string | null;
  full_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  postcode: string | null;
  deal_value: string | null;
  created_at: string;
};

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    serviceTypeKey: row.service_type_key,
    serviceTypeLabel: row.service_type_label,
    status: row.status,
    assignedProviderId: row.assigned_provider_id,
    assignedProviderName: row.assigned_provider_name,
    fullName: row.full_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    postcode: row.postcode,
    dealValue: row.deal_value,
    createdAt: row.created_at,
  };
}

/**
 * Lists leads visible to the caller's role. Relies on the same two-layer
 * enforcement as everything else: the WHERE clause is the explicit
 * app-layer scoping (primary), and RLS (set via withTenantContext) is the
 * defense-in-depth net under it — a bug in one clause here still can't
 * leak rows across tenants/providers.
 */
export async function listLeads(ctx: SessionContext): Promise<Lead[]> {
  return withTenantContext(ctx, async (tx) => {
    const rows = await tx<LeadRow[]>`
      select
        l.id, l.tenant_id, t.name as tenant_name,
        st.key as service_type_key, st.name as service_type_label,
        l.status, l.assigned_provider_id, sp.company_name as assigned_provider_name,
        l.full_name, l.contact_email, l.contact_phone, l.postcode,
        l.deal_value, l.created_at
      from leads l
      join tenants t on t.id = l.tenant_id
      join service_types st on st.id = l.service_type_id
      left join service_providers sp on sp.id = l.assigned_provider_id
      where ${
        ctx.role === "franchisee"
          ? tx`l.tenant_id = ${ctx.tenantId}`
          : ctx.role === "service_provider"
            ? tx`l.assigned_provider_id = ${ctx.providerId}`
            : tx`true`
      }
      order by l.created_at desc
    `;
    return rows.map(toLead);
  });
}

const PROVIDER_ASSIGNABLE_ROLES = new Set(["super_admin", "franchisor"]);

export async function assignLeadToProvider(
  ctx: SessionContext,
  leadId: string,
  providerId: string,
): Promise<void> {
  if (!PROVIDER_ASSIGNABLE_ROLES.has(ctx.role)) {
    throw new Error("Only the franchisor can assign leads to a provider.");
  }

  await withTenantContext(ctx, async (tx) => {
    const rows = await tx`
      update leads
      set assigned_provider_id = ${providerId}, status = 'assigned_to_provider', updated_at = now()
      where id = ${leadId}
      returning id
    `;
    if (rows.length === 0) throw new Error("Lead not found.");

    await tx`
      insert into lead_status_history (lead_id, status, changed_by, note)
      values (${leadId}, 'assigned_to_provider', ${ctx.userId}, 'Assigned to provider')
    `;
  });
}

const PROVIDER_SETTABLE_STATUSES: LeadStatus[] = ["in_progress", "won", "lost", "disqualified"];
// rebate_received/rebate_paid are franchisor-only — the provider closes
// the deal, but tracking whether the franchise received and then paid
// out the rebate is a franchisor accounting concern, not the provider's.
const REBATE_STATUSES: LeadStatus[] = ["rebate_received", "rebate_paid"];

export async function updateLeadStatus(
  ctx: SessionContext,
  leadId: string,
  status: LeadStatus,
  opts?: { dealValue?: number; note?: string },
): Promise<void> {
  if (ctx.role === "service_provider" && !PROVIDER_SETTABLE_STATUSES.includes(status)) {
    throw new Error("Providers can only move a lead to in_progress, won, lost, or disqualified.");
  }
  if (ctx.role === "franchisee") {
    throw new Error("Franchisees have view-only access to lead status.");
  }
  if (REBATE_STATUSES.includes(status) && ctx.role !== "super_admin" && ctx.role !== "franchisor") {
    throw new Error("Only the franchisor can update rebate status.");
  }

  await withTenantContext(ctx, async (tx) => {
    const rows = await tx`
      update leads
      set status = ${status},
          deal_value = coalesce(${opts?.dealValue ?? null}, deal_value),
          updated_at = now()
      where id = ${leadId}
      returning id
    `;
    if (rows.length === 0) throw new Error("Lead not found or not authorized.");

    await tx`
      insert into lead_status_history (lead_id, status, changed_by, note)
      values (${leadId}, ${status}, ${ctx.userId}, ${opts?.note ?? null})
    `;
  });
}

export type LeadStatusHistoryEntry = {
  status: LeadStatus;
  changedByName: string | null;
  note: string | null;
  changedAt: string;
};

export type LeadDetail = Lead & {
  details: Record<string, unknown>;
  consentToContact: boolean;
  updatedAt: string;
  statusHistory: LeadStatusHistoryEntry[];
};

/**
 * Full detail view for a single lead — the free-text/structured answers
 * the chat agent collected (leads.details), plus the full status-change
 * audit trail. Same role-scoping as listLeads (a provider can only open
 * a lead assigned to them, a franchisee only one from their own tenant).
 */
export async function getLeadDetail(ctx: SessionContext, leadId: string): Promise<LeadDetail | null> {
  return withTenantContext(ctx, async (tx) => {
    const rows = await tx<(LeadRow & { details: Record<string, unknown>; consent_to_contact: boolean; updated_at: string })[]>`
      select
        l.id, l.tenant_id, t.name as tenant_name,
        st.key as service_type_key, st.name as service_type_label,
        l.status, l.assigned_provider_id, sp.company_name as assigned_provider_name,
        l.full_name, l.contact_email, l.contact_phone, l.postcode,
        l.deal_value, l.created_at, l.updated_at, l.details, l.consent_to_contact
      from leads l
      join tenants t on t.id = l.tenant_id
      join service_types st on st.id = l.service_type_id
      left join service_providers sp on sp.id = l.assigned_provider_id
      where l.id = ${leadId}
      and ${
        ctx.role === "franchisee"
          ? tx`l.tenant_id = ${ctx.tenantId}`
          : ctx.role === "service_provider"
            ? tx`l.assigned_provider_id = ${ctx.providerId}`
            : tx`true`
      }
      limit 1
    `;
    if (rows.length === 0) return null;

    const historyRows = await tx<{ status: LeadStatus; note: string | null; changed_at: string; changed_by_name: string | null }[]>`
      select h.status, h.note, h.changed_at, u.full_name as changed_by_name
      from lead_status_history h
      left join users u on u.id = h.changed_by
      where h.lead_id = ${leadId}
      order by h.changed_at asc
    `;

    const row = rows[0];
    return {
      ...toLead(row),
      details: row.details ?? {},
      consentToContact: row.consent_to_contact,
      updatedAt: row.updated_at,
      statusHistory: historyRows.map((h) => ({
        status: h.status,
        changedByName: h.changed_by_name,
        note: h.note,
        changedAt: h.changed_at,
      })),
    };
  });
}
