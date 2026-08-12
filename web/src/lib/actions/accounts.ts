"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionContext } from "@/lib/auth/session-context";
import { createFranchisee, createServiceProvider, AccountConflictError } from "@/lib/db/accounts";

export type AccountFormState = { error: string | null };

function optionalString(value: FormDataEntryValue | null): string | null {
  const str = value ? String(value).trim() : "";
  return str.length > 0 ? str : null;
}

export async function createFranchiseeAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await requireSessionContext();

  try {
    await createFranchisee(ctx.role, {
      name: String(formData.get("name")).trim(),
      slug: String(formData.get("slug")).trim().toLowerCase(),
      status: String(formData.get("status")) as "active" | "onboarding" | "suspended",
      phone: optionalString(formData.get("phone")),
      email: optionalString(formData.get("email")),
      address: optionalString(formData.get("address")),
      businessHours: optionalString(formData.get("businessHours")),
      localBlurb: optionalString(formData.get("localBlurb")),
      ownerFullName: String(formData.get("ownerFullName")).trim(),
      loginEmail: String(formData.get("loginEmail")).trim(),
      loginPassword: String(formData.get("loginPassword")),
    });
  } catch (err) {
    if (err instanceof AccountConflictError) return { error: err.message };
    return { error: "Something went wrong creating this franchisee. Please try again." };
  }

  revalidatePath("/dashboard/franchisees");
  redirect("/dashboard/franchisees");
}

export async function createServiceProviderAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await requireSessionContext();
  const serviceTypes = formData.getAll("serviceTypes").map(String);

  if (serviceTypes.length === 0) {
    return { error: "Select at least one service this provider handles." };
  }

  try {
    await createServiceProvider(ctx.role, {
      companyName: String(formData.get("companyName")).trim(),
      serviceTypes,
      fullName: String(formData.get("fullName")).trim(),
      loginEmail: String(formData.get("loginEmail")).trim(),
      loginPassword: String(formData.get("loginPassword")),
    });
  } catch (err) {
    if (err instanceof AccountConflictError) return { error: err.message };
    return { error: "Something went wrong creating this provider. Please try again." };
  }

  revalidatePath("/dashboard/providers");
  redirect("/dashboard/providers");
}
