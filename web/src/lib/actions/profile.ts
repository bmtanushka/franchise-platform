"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionContext } from "@/lib/auth/session-context";
import { updateFranchiseeProfile, updateTenantTemplate } from "@/lib/db/site-content";

export type ProfileFormState = { error: string | null };

function optionalString(value: FormDataEntryValue | null): string | null {
  const str = value ? String(value).trim() : "";
  return str.length > 0 ? str : null;
}

/**
 * Franchisee editing their OWN site — deliberately narrower than the
 * admin edit action: only the fields the brief whitelists for franchisee
 * self-service (contact details) plus the template pick. No name/slug/
 * status — those go through the franchisor (see updateFranchiseeAdminAction).
 */
export async function updateOwnFranchiseeProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const ctx = await requireSessionContext();

  if (ctx.role !== "franchisee" || !ctx.tenantId) {
    return { error: "Only a franchisee can edit their own site." };
  }

  try {
    await updateFranchiseeProfile(ctx.tenantId, {
      phone: optionalString(formData.get("phone")),
      email: optionalString(formData.get("email")),
      address: optionalString(formData.get("address")),
      businessHours: optionalString(formData.get("businessHours")),
      localBlurb: optionalString(formData.get("localBlurb")),
    });

    const templateId = String(formData.get("templateId"));
    if (templateId) {
      await updateTenantTemplate(ctx.tenantId, templateId);
    }
  } catch {
    return { error: "Something went wrong saving these changes. Please try again." };
  }

  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile");
}
