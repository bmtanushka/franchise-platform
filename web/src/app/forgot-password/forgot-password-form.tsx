"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type AuthFormState } from "@/lib/actions/auth";
import { inputClass, labelClass, primaryButtonClass, linkClass } from "@/lib/dashboard-ui";

const initialState: AuthFormState = { error: null, success: false };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="font-body rounded-md bg-success-bg px-3 py-2 text-sm text-success-text">
          If an account exists for that email, we&apos;ve sent a reset link. It expires in 1 hour.
        </p>
        <Link href="/login" className={linkClass}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Sending..." : "Send reset link"}
      </button>

      <Link href="/login" className={`${linkClass} block text-center`}>
        Back to sign in
      </Link>
    </form>
  );
}
