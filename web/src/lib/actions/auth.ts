"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getUserByEmail, getUserById, updateUserPassword } from "@/lib/db/users";
import { createPasswordResetToken, consumeResetToken } from "@/lib/db/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { requireSessionContext } from "@/lib/auth/session-context";

export type AuthFormState = { error: string | null; success: boolean };

export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address.", success: false };

  const user = await getUserByEmail(email);
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  // Same response whether or not the account exists — a different message
  // for "no such email" would let anyone enumerate registered addresses.
  return { error: null, success: true };
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters.", success: false };
  if (password !== confirmPassword) return { error: "Passwords don't match.", success: false };

  const userId = await consumeResetToken(token);
  if (!userId) return { error: "This reset link is invalid or has expired.", success: false };

  const passwordHash = await bcrypt.hash(password, 10);
  await updateUserPassword(userId, passwordHash);

  redirect("/login?reset=success");
}

export async function changePasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ctx = await requireSessionContext();
  if (!ctx.userId) return { error: "Something went wrong. Please try again.", success: false };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) return { error: "New password must be at least 8 characters.", success: false };
  if (newPassword !== confirmPassword) return { error: "New passwords don't match.", success: false };

  const user = await getUserById(ctx.userId);
  if (!user?.passwordHash) return { error: "Something went wrong. Please try again.", success: false };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect.", success: false };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(ctx.userId, passwordHash);

  return { error: null, success: true };
}
