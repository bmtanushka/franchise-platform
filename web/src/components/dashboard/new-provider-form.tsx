"use client";

import { useActionState } from "react";
import { createServiceProviderAction, type AccountFormState } from "@/lib/actions/accounts";
import type { ServiceType } from "@/lib/db/providers";

const initialState: AccountFormState = { error: null };

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";
const labelClass = "block text-sm font-medium mb-1";

export function NewProviderForm({ serviceTypes }: { serviceTypes: ServiceType[] }) {
  const [state, formAction, pending] = useActionState(createServiceProviderAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-medium opacity-70">Provider details</h2>

        <div>
          <label className={labelClass} htmlFor="companyName">
            Company name
          </label>
          <input id="companyName" name="companyName" required className={inputClass} />
        </div>

        <div>
          <span className={labelClass}>Services handled</span>
          <div className="grid grid-cols-2 gap-2">
            {serviceTypes.map((st) => (
              <label key={st.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="serviceTypes" value={st.key} className="h-4 w-4" />
                {st.name}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium opacity-70">Login</h2>

        <div>
          <label className={labelClass} htmlFor="fullName">
            Contact full name
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
          <p className="mt-1 text-xs opacity-60">Share this with the provider directly — it isn&apos;t emailed automatically.</p>
        </div>
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Creating..." : "Create provider"}
      </button>
    </form>
  );
}
