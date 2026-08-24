"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionContext } from "@/lib/auth/session-context";
import {
  createFranchisee,
  createServiceProvider,
  updateFranchiseeAdmin,
  updateServiceProvider,
  createAdminUser,
  updateAdminUser,
  AccountConflictError,
} from "@/lib/db/accounts";
import type { ServiceArea } from "@/lib/db/providers";

export type AccountFormState = { error: string | null };

function optionalString(value: FormDataEntryValue | null): string | null {
  const str = value ? String(value).trim() : "";
  return str.length > 0 ? str : null;
}

function parseServiceAreas(value: FormDataEntryValue | null): ServiceArea[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
    if (err instanceof Error && err.message.startsWith("Only a super admin")) return { error: err.message };
    return { error: "Something went wrong creating this franchisee. Please try again." };
  }

  revalidatePath("/dashboard/franchisees");
  redirect("/dashboard/franchisees");
}

export async function updateFranchiseeAdminAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await requireSessionContext();
  const tenantId = String(formData.get("tenantId"));

  try {
    await updateFranchiseeAdmin(ctx.role, tenantId, {
      name: String(formData.get("name")).trim(),
      slug: String(formData.get("slug")).trim().toLowerCase(),
      status: String(formData.get("status")) as "active" | "onboarding" | "suspended",
      templateId: String(formData.get("templateId")),
      phone: optionalString(formData.get("phone")),
      email: optionalString(formData.get("email")),
      address: optionalString(formData.get("address")),
      businessHours: optionalString(formData.get("businessHours")),
      localBlurb: optionalString(formData.get("localBlurb")),
    });
  } catch (err) {
    if (err instanceof AccountConflictError) return { error: err.message };
    return { error: "Something went wrong saving these changes. Please try again." };
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
      serviceAreas: parseServiceAreas(formData.get("serviceAreas")),
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

export async function updateServiceProviderAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await requireSessionContext();
  const providerId = String(formData.get("providerId"));
  const serviceTypes = formData.getAll("serviceTypes").map(String);

  if (serviceTypes.length === 0) {
    return { error: "Select at least one service this provider handles." };
  }

  try {
    await updateServiceProvider(ctx.role, providerId, {
      companyName: String(formData.get("companyName")).trim(),
      serviceTypes,
      serviceAreas: parseServiceAreas(formData.get("serviceAreas")),
    });
  } catch {
    return { error: "Something went wrong saving these changes. Please try again." };
  }

  revalidatePath("/dashboard/providers");
  redirect("/dashboard/providers");
}

export async function createAdminUserAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await requireSessionContext();
  const role = String(formData.get("role"));

  if (role !== "super_admin" && role !== "franchisor") {
    return { error: "Select a role." };
  }

  try {
    await createAdminUser(ctx.role, {
      fullName: String(formData.get("fullName")).trim(),
      loginEmail: String(formData.get("loginEmail")).trim(),
      loginPassword: String(formData.get("loginPassword")),
      role,
    });
  } catch (err) {
    if (err instanceof AccountConflictError) return { error: err.message };
    if (err instanceof Error && err.message.startsWith("Only a super admin")) return { error: err.message };
    return { error: "Something went wrong creating this account. Please try again." };
  }

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}

export async function updateAdminUserAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await requireSessionContext();
  const targetUserId = String(formData.get("userId"));
  const role = String(formData.get("role"));

  if (role !== "super_admin" && role !== "franchisor") {
    return { error: "Select a role." };
  }

  try {
    await updateAdminUser(ctx.role, ctx.userId, targetUserId, {
      fullName: String(formData.get("fullName")).trim(),
      role,
    });
  } catch (err) {
    // These are all deliberately user-facing validation messages (self-role-change,
    // last-super-admin, not found, unauthorized) — safe to surface directly, unlike
    // a raw DB error.
    if (err instanceof Error) return { error: err.message };
    return { error: "Something went wrong saving these changes. Please try again." };
  }

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}
