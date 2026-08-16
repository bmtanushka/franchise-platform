"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveLeadStatusAction } from "@/lib/actions/leads";
import { STATUS_LABEL } from "@/lib/lead-status-labels";
import type { LeadStatus } from "@/lib/db/leads";

// A franchise-sales pipeline never involves a provider or a rebate, so this
// intentionally offers a narrower subset than the full LeadStatus enum —
// UI affordance only, updateLeadStatus itself already permits franchisor/
// super_admin any status.
const SELECTABLE_STATUSES: LeadStatus[] = ["qualified", "in_progress", "won", "lost", "disqualified"];

export function FranchiseProspectStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as LeadStatus;
          const prev = current;
          setCurrent(next);
          setError(null);
          startTransition(async () => {
            const result = await moveLeadStatusAction(leadId, next);
            if (result.error) {
              setCurrent(prev);
              setError(result.error);
            } else {
              router.refresh();
            }
          });
        }}
        className="font-body rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink"
      >
        {SELECTABLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {error && <span className="font-body text-xs text-error-text">{error}</span>}
    </div>
  );
}
