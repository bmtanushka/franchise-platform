"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: AuthFormState = { error: null, success: false };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className={labelClass} htmlFor="password">
          New password
        </label>
        <input id="password" name="password" type="password" required minLength={8} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}
