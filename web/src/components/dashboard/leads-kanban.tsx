"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, LeadStatus } from "@/lib/db/leads";
import { moveLeadStatusAction, assignLeadInlineAction } from "@/lib/actions/leads";
import { STATUS_LABEL } from "@/lib/lead-status-labels";
import { PROVIDER_NEXT_STATUSES, NEXT_REBATE_STATUS } from "@/lib/lead-status-rules";
import { StatusBadge, STATUS_TONE } from "@/components/dashboard/status-badge";
import { cardClass, inputClass } from "@/lib/dashboard-ui";
import type { Role } from "@/lib/db/context";

const COLUMN_ORDER: LeadStatus[] = [
  "new",
  "qualified",
  "assigned_to_provider",
  "in_progress",
  "won",
  "rebate_received",
  "rebate_paid",
  "lost",
  "disqualified",
];

// service_provider only ever sees leads already assigned to them
// (listLeads scopes by assigned_provider_id) — a lead can't reach them
// before assigned_to_provider, so "New"/"Qualified" would always be
// permanently empty, dead columns on their board; hide those two. Also
// reordered so the statuses they can actually drag into (in_progress/
// won/lost/disqualified — PROVIDER_NEXT_STATUSES) sit together right
// after Assigned for fast access, with rebate_received/rebate_paid
// pushed to the end since providers can only ever view those, never
// move a card into them (franchisor-only, see NEXT_REBATE_STATUS).
const PROVIDER_COLUMN_ORDER: LeadStatus[] = [
  "assigned_to_provider",
  "in_progress",
  "won",
  "lost",
  "disqualified",
  "rebate_received",
  "rebate_paid",
];

function visibleColumns(role: Role): LeadStatus[] {
  if (role === "service_provider") return PROVIDER_COLUMN_ORDER;
  return COLUMN_ORDER;
}

const COLUMN_ACCENT: Record<string, string> = {
  info: "border-t-info-text",
  warning: "border-t-warning-text",
  success: "border-t-success-text",
  error: "border-t-error-text",
  neutral: "border-t-neutral-text",
};

// Which statuses a card in `from` can be dropped onto, for this role. Kept
// in lockstep with what the table view already exposes per role (providers
// get the in_progress/won/lost/disqualified form, franchisor/super_admin
// only get the rebate-advance button — they don't get a general status
// setter there either) rather than the wider set updateLeadStatus's guards
// would technically allow, so the two views behave identically.
function allowedTargets(role: Role, from: LeadStatus): Set<LeadStatus> {
  const targets = new Set<LeadStatus>();
  if (role === "service_provider") {
    for (const s of PROVIDER_NEXT_STATUSES) if (s !== from) targets.add(s);
  }
  if (role === "franchisor" || role === "super_admin") {
    const nextRebate = NEXT_REBATE_STATUS[from];
    if (nextRebate) targets.add(nextRebate);
  }
  return targets;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function LeadsKanban({
  leads: leadsProp,
  providers,
  role,
}: {
  leads: Lead[];
  providers: { id: string; companyName: string; serviceTypes: string[] }[];
  role: Role;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(leadsProp);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setLeads(leadsProp), [leadsProp]);

  const columns = useMemo(() => visibleColumns(role), [role]);

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>();
    for (const status of columns) map.set(status, []);
    for (const lead of leads) map.get(lead.status)?.push(lead);
    return map;
  }, [leads, columns]);

  const showTenant = role === "super_admin" || role === "franchisor";
  const canAssign = role === "super_admin" || role === "franchisor";

  async function commitMove(lead: Lead, status: LeadStatus) {
    let dealValue: number | undefined;
    if (status === "won") {
      const input = window.prompt("Deal value for this lead (optional):", lead.dealValue ?? "");
      if (input === null) return; // cancelled — leave the card where it was
      if (input.trim() !== "") {
        const parsed = Number(input);
        if (Number.isNaN(parsed)) {
          setError("Deal value must be a number.");
          return;
        }
        dealValue = parsed;
      }
    }

    const prevLeads = leads;
    setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, status, dealValue: dealValue != null ? String(dealValue) : l.dealValue } : l)));
    setError(null);

    const result = await moveLeadStatusAction(lead.id, status, dealValue);
    if (result.error) {
      setLeads(prevLeads);
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  function handleDrop(status: LeadStatus) {
    setDragOverStatus(null);
    const lead = leads.find((l) => l.id === dragLeadId);
    setDragLeadId(null);
    if (!lead) return;
    if (!allowedTargets(role, lead.status).has(status)) return;
    void commitMove(lead, status);
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">
          <span className="font-body">{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-body text-xs underline">
            Dismiss
          </button>
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((status) => {
          const columnLeads = byStatus.get(status) ?? [];
          const isDropTarget = dragOverStatus === status;
          const draggedLead = leads.find((l) => l.id === dragLeadId);
          const isValidTarget = draggedLead ? allowedTargets(role, draggedLead.status).has(status) : false;

          return (
            <div
              key={status}
              onDragOver={(e) => {
                if (!draggedLead || !isValidTarget) return;
                e.preventDefault();
                if (dragOverStatus !== status) setDragOverStatus(status);
              }}
              onDragLeave={() => setDragOverStatus((cur) => (cur === status ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(status);
              }}
              className={`flex w-72 shrink-0 flex-col rounded-[10px] border-t-4 bg-sage-tint/40 ${COLUMN_ACCENT[STATUS_TONE[status]]} ${
                isDropTarget && isValidTarget ? "ring-2 ring-moss" : ""
              } ${draggedLead && !isValidTarget ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="font-heading text-sm font-semibold text-ink">{STATUS_LABEL[status]}</span>
                <span className="font-body rounded-full bg-surface px-2 py-0.5 text-xs text-slate">
                  {columnLeads.length}
                </span>
              </div>
              <div className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2" style={{ maxHeight: "calc(100vh - 320px)" }}>
                {columnLeads.map((lead) => {
                  const draggable = allowedTargets(role, lead.status).size > 0;
                  return (
                    <div
                      key={lead.id}
                      draggable={draggable}
                      onDragStart={(e) => {
                        setDragLeadId(lead.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragLeadId(null);
                        setDragOverStatus(null);
                      }}
                      className={`${cardClass} space-y-1.5 p-3 ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${
                        dragLeadId === lead.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/dashboard/leads/${lead.id}`} draggable={false} className="font-body text-sm font-medium text-ink hover:text-moss">
                          {lead.fullName ?? "—"}
                        </Link>
                      </div>
                      <div className="font-body text-xs text-slate">{lead.contactEmail}</div>
                      {showTenant && <div className="font-body text-xs text-slate">{lead.tenantName}</div>}
                      <div className="font-body text-xs text-slate">{lead.serviceTypeLabel}</div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-body text-xs text-slate" title={new Date(lead.createdAt).toLocaleString()}>
                          {formatDate(lead.createdAt)}
                        </span>
                        {lead.dealValue && (
                          <span className="font-body text-xs font-medium tabular-nums text-gold">${lead.dealValue}</span>
                        )}
                      </div>
                      {lead.assignedProviderName && (
                        <div className="font-body text-xs text-slate">→ {lead.assignedProviderName}</div>
                      )}
                      {canAssign && !lead.assignedProviderId && (
                        <InlineAssign lead={lead} providers={providers} onAssigned={() => router.refresh()} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InlineAssign({
  lead,
  providers,
  onAssigned,
}: {
  lead: Lead;
  providers: { id: string; companyName: string; serviceTypes: string[] }[];
  onAssigned: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleChange(providerId: string) {
    if (!providerId) return;
    setSubmitting(true);
    const result = await assignLeadInlineAction(lead.id, providerId);
    setSubmitting(false);
    if (!result.error) onAssigned();
  }

  return (
    <select
      defaultValue=""
      disabled={submitting}
      onChange={(e) => handleChange(e.target.value)}
      className={`${inputClass} !w-full !py-1 !text-xs`}
    >
      <option value="">Assign to...</option>
      {providers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.companyName}
        </option>
      ))}
    </select>
  );
}
