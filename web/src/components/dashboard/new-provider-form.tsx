"use client";

import { useActionState } from "react";
import { createServiceProviderAction, type AccountFormState } from "@/lib/actions/accounts";
import type { ServiceType } from "@/lib/db/providers";
import type { USState } from "@/lib/us-locations";
import { ServiceAreaPicker } from "@/components/dashboard/service-area-picker";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: AccountFormState = { error: null };

export function NewProviderForm({ serviceTypes, states }: { serviceTypes: ServiceType[]; states: USState[] }) {
  const [state, formAction, pending] = useActionState(createServiceProviderAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <section className="space-y-4">
        <h2 className="font-heading text-sm font-semibold text-slate">Provider details</h2>

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
              <label key={st.key} className="font-body flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="serviceTypes" value={st.key} className="h-4 w-4 accent-forest" />
                {st.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>Service areas</span>
          <p className="font-body -mt-0.5 mb-2 text-xs text-slate">
            Which states and cities this provider actually covers.
          </p>
          <ServiceAreaPicker states={states} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-sm font-semibold text-slate">Login</h2>

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
          <p className="font-body mt-1 text-xs text-slate">
            Share this with the provider directly — it isn&apos;t emailed automatically.
          </p>
        </div>
      </section>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Creating..." : "Create provider"}
      </button>
    </form>
  );
}
