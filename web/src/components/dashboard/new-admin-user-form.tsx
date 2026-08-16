"use client";

import { useActionState } from "react";
import { createAdminUserAction, type AccountFormState } from "@/lib/actions/accounts";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: AccountFormState = { error: null };

export function NewAdminUserForm() {
  const [state, formAction, pending] = useActionState(createAdminUserAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <section className="space-y-4">
        <h2 className="font-heading text-sm font-semibold text-slate">Account</h2>

        <div>
          <label className={labelClass} htmlFor="role">
            Role
          </label>
          <select id="role" name="role" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select a role...
            </option>
            <option value="franchisor">Franchisor</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="fullName">
            Full name
          </label>
          <input id="fullName" name="fullName" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="loginEmail">
            Login email
          </label>
          <input id="loginEmail" name="loginEmail" type="email" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="loginPassword">
            Password
          </label>
          <input
            id="loginPassword"
            name="loginPassword"
            type="password"
            required
            minLength={8}
            className={inputClass}
          />
          <p className="font-body mt-1 text-xs text-slate">
            Share this with them directly — it isn&apos;t emailed automatically.
          </p>
        </div>
      </section>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}
