"use client";

import { useState } from "react";
import type { Lead } from "@/lib/db/leads";
import type { Role } from "@/lib/db/context";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { LeadsKanban } from "@/components/dashboard/leads-kanban";

type View = "table" | "kanban";

const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium font-body transition-colors ${
    active ? "bg-forest text-white" : "text-slate hover:bg-sage-tint"
  }`;

export function LeadsViewSwitcher({
  leads,
  providers,
  role,
}: {
  leads: Lead[];
  providers: { id: string; companyName: string; serviceTypes: string[] }[];
  role: Role;
}) {
  const [view, setView] = useState<View>("table");

  return (
    <div className="space-y-3">
      <div className="inline-flex gap-1 rounded-md border border-border bg-surface p-1">
        <button type="button" onClick={() => setView("table")} className={tabClass(view === "table")}>
          Table
        </button>
        <button type="button" onClick={() => setView("kanban")} className={tabClass(view === "kanban")}>
          Kanban
        </button>
      </div>

      {view === "table" ? (
        <LeadsTable leads={leads} providers={providers} role={role} />
      ) : (
        <LeadsKanban leads={leads} providers={providers} role={role} />
      )}
    </div>
  );
}
