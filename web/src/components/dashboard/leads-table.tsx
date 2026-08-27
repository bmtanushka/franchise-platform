"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/db/leads";
import { assignLeadAction, updateLeadStatusAction } from "@/lib/actions/leads";
import { STATUS_LABEL } from "@/lib/lead-status-labels";
import { PROVIDER_NEXT_STATUSES, NEXT_REBATE_STATUS } from "@/lib/lead-status-rules";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { inputClass, secondaryButtonClass, linkClass } from "@/lib/dashboard-ui";
import type { Role } from "@/lib/db/context";

const thClass = "px-4 py-3 text-left font-body text-xs font-semibold uppercase tracking-[0.03em] text-slate";
const thSortableClass = "text-left font-body text-xs font-semibold uppercase tracking-[0.03em] text-slate";
const tdClass = "px-4 py-3 align-middle font-body text-sm text-ink";

type SortKey =
  | "tenantName"
  | "serviceTypeLabel"
  | "fullName"
  | "status"
  | "assignedProviderName"
  | "dealValue"
  | "createdAt";
type SortDir = "asc" | "desc";

function compareLeads(a: Lead, b: Lead, key: SortKey, dir: SortDir): number {
  const mult = dir === "asc" ? 1 : -1;
  switch (key) {
    case "dealValue": {
      const av = a.dealValue ? Number(a.dealValue) : null;
      const bv = b.dealValue ? Number(b.dealValue) : null;
      if (av === null && bv === null) return 0;
      if (av === null) return 1; // no-value rows always sort last, either direction
      if (bv === null) return -1;
      return (av - bv) * mult;
    }
    case "createdAt":
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * mult;
    case "status":
      return STATUS_LABEL[a.status].localeCompare(STATUS_LABEL[b.status]) * mult;
    case "tenantName":
      return a.tenantName.localeCompare(b.tenantName) * mult;
    case "serviceTypeLabel":
      return a.serviceTypeLabel.localeCompare(b.serviceTypeLabel) * mult;
    case "fullName":
      return (a.fullName ?? "").localeCompare(b.fullName ?? "") * mult;
    case "assignedProviderName":
      return (a.assignedProviderName ?? "").localeCompare(b.assignedProviderName ?? "") * mult;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function LeadsTable({
  leads,
  providers,
  role,
}: {
  leads: Lead[];
  providers: { id: string; companyName: string; serviceTypes: string[] }[];
  role: Role;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "createdAt", dir: "desc" });

  const serviceOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const l of leads) seen.set(l.serviceTypeKey, l.serviceTypeLabel);
    return [...seen.entries()];
  }, [leads]);

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (serviceFilter && l.serviceTypeKey !== serviceFilter) return false;
      if (q) {
        const haystack = `${l.fullName ?? ""} ${l.contactEmail ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => compareLeads(a, b, sort.key, sort.dir));
  }, [leads, search, statusFilter, serviceFilter, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function SortHeader({ label, sortKey, right }: { label: string; sortKey: SortKey; right?: boolean }) {
    const active = sort.key === sortKey;
    return (
      <th className={thSortableClass}>
        <button
          type="button"
          onClick={() => toggleSort(sortKey)}
          className={`flex w-full items-center gap-1 px-4 py-3 hover:text-ink ${right ? "flex-row-reverse justify-start" : ""}`}
        >
          {label}
          <span className="w-2.5 text-[10px] text-moss">{active ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
        </button>
      </th>
    );
  }

  const showTenant = role === "super_admin" || role === "franchisor";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} !w-56`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")} className={`${inputClass} !w-auto`}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={`${inputClass} !w-auto`}>
          <option value="">All services</option>
          {serviceOptions.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {(search || statusFilter || serviceFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setServiceFilter("");
            }}
            className={linkClass}
          >
            Clear filters
          </button>
        )}
        <span className="font-body ml-auto text-xs text-slate">
          {visibleLeads.length} of {leads.length}
        </span>
      </div>

      {visibleLeads.length === 0 ? (
        <div className="rounded-[10px] border border-border bg-surface p-8 text-center">
          <p className="font-body text-sm text-slate">No leads match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border bg-sage-tint">
                {showTenant && <SortHeader label="Tenant" sortKey="tenantName" />}
                <SortHeader label="Service" sortKey="serviceTypeLabel" />
                <SortHeader label="Contact" sortKey="fullName" />
                <SortHeader label="Status" sortKey="status" />
                <SortHeader label="Provider" sortKey="assignedProviderName" />
                <SortHeader label="Deal value" sortKey="dealValue" right />
                <SortHeader label="Captured" sortKey="createdAt" />
                <th className={thClass}>Details</th>
                {role !== "franchisee" && <th className={thClass}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-sage-tint/60">
                  {showTenant && <td className={tdClass}>{lead.tenantName}</td>}
                  <td className={tdClass}>{lead.serviceTypeLabel}</td>
                  <td className={tdClass}>
                    <div>{lead.fullName ?? "—"}</div>
                    <div className="text-xs text-slate">{lead.contactEmail}</div>
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className={tdClass}>{lead.assignedProviderName ?? "—"}</td>
                  <td
                    className={`${tdClass} text-right font-medium tabular-nums ${lead.dealValue ? "text-gold" : "text-slate"}`}
                  >
                    {lead.dealValue ? `$${lead.dealValue}` : "—"}
                  </td>
                  <td className={tdClass} title={new Date(lead.createdAt).toLocaleString()}>
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className={tdClass}>
                    <Link href={`/dashboard/leads/${lead.id}`} className={linkClass}>
                      View
                    </Link>
                  </td>
                  {role !== "franchisee" && (
                    <td className={tdClass}>
                      <div className="flex flex-col gap-1.5">
                        {(role === "super_admin" || role === "franchisor") && !lead.assignedProviderId && (
                          <AssignForm leadId={lead.id} providers={providers} />
                        )}
                        {role === "service_provider" && (
                          <UpdateStatusForm leadId={lead.id} currentStatus={lead.status} currentDealValue={lead.dealValue} />
                        )}
                        {(role === "super_admin" || role === "franchisor") && NEXT_REBATE_STATUS[lead.status] && (
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
      )}
    </div>
  );
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
