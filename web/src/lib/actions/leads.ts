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
