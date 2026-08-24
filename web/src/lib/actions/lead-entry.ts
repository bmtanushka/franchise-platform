"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionContext } from "@/lib/auth/session-context";
import { createLeadFromEntry } from "@/lib/db/lead-entry";

export type LeadEntryFormState = { error: string | null };

export async function createLeadFromEntryAction(
  _prevState: LeadEntryFormState,
  formData: FormData,
): Promise<LeadEntryFormState> {
  const ctx = await requireSessionContext();
  const serviceId = String(formData.get("serviceId"));

  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("answer:")) {
      answers[key.slice("answer:".length)] = String(value);
    }
  }

  let leadId: string;
  try {
    const result = await createLeadFromEntry(ctx, serviceId, answers);
    leadId = result.leadId;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong submitting this lead." };
  }

  revalidatePath("/dashboard/leads");
  redirect(`/dashboard/leads/${leadId}`);
}
