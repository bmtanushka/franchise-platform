"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionContext } from "@/lib/auth/session-context";
import { assignLeadToProvider, updateLeadStatus, type LeadStatus } from "@/lib/db/leads";

export async function assignLeadAction(formData: FormData): Promise<void> {
  const ctx = await requireSessionContext();
  const leadId = String(formData.get("leadId"));
  const providerId = String(formData.get("providerId"));

  await assignLeadToProvider(ctx, leadId, providerId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateLeadStatusAction(formData: FormData): Promise<void> {
  const ctx = await requireSessionContext();
  const leadId = String(formData.get("leadId"));
  const status = String(formData.get("status")) as LeadStatus;
  const dealValueRaw = formData.get("dealValue");
  const note = formData.get("note");

  await updateLeadStatus(ctx, leadId, status, {
    dealValue: dealValueRaw ? Number(dealValueRaw) : undefined,
    note: note ? String(note) : undefined,
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// Non-redirecting counterparts for the kanban board's drag-and-drop and
// inline assign controls, which are plain function calls from a client
// component (not <form action={...}> submissions) and need to stay on the
// page and report success/failure instead of navigating away.
export async function moveLeadStatusAction(
  leadId: string,
  status: LeadStatus,
  dealValue?: number,
): Promise<{ error: string | null }> {
  const ctx = await requireSessionContext();
  try {
    await updateLeadStatus(ctx, leadId, status, { dealValue });
    revalidatePath("/dashboard/leads");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update status." };
  }
}

export async function assignLeadInlineAction(leadId: string, providerId: string): Promise<{ error: string | null }> {
  const ctx = await requireSessionContext();
  try {
    await assignLeadToProvider(ctx, leadId, providerId);
    revalidatePath("/dashboard/leads");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to assign lead." };
  }
}
