"use client";

import { useActionState } from "react";
import { updateAdminUserAction, type AccountFormState } from "@/lib/actions/accounts";
import type { AdminUser } from "@/lib/db/users";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: AccountFormState = { error: null };

export function EditAdminUserForm({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [state, formAction, pending] = useActionState(updateAdminUserAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="userId" value={user.id} />

      <section className="space-y-4">
        <h2 className="font-heading text-sm font-semibold text-slate">Account</h2>

        <div>
          <label className={labelClass}>Email</label>
          <p className="font-body text-sm text-ink">{user.email}</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="fullName">
            Full name
          </label>
          <input id="fullName" name="fullName" required defaultValue={user.fullName ?? ""} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="role">
            Role
          </label>
          {isSelf ? (
            <>
              <input type="hidden" name="role" value={user.role} />
              <select id="role" disabled defaultValue={user.role} className={`${inputClass} opacity-60`}>
                <option value="franchisor">Franchisor</option>
                <option value="super_admin">Super admin</option>
              </select>
              <p className="font-body mt-1 text-xs text-slate">You can&apos;t change your own role.</p>
            </>
          ) : (
            <select id="role" name="role" required defaultValue={user.role} className={inputClass}>
              <option value="franchisor">Franchisor</option>
              <option value="super_admin">Super admin</option>
            </select>
          )}
        </div>
      </section>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
