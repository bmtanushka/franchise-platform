"use client";

import { useActionState } from "react";
import { updateServiceProviderAction, type AccountFormState } from "@/lib/actions/accounts";
import type { ServiceProvider, ServiceType } from "@/lib/db/providers";
import type { USState } from "@/lib/us-locations";
import { ServiceAreaPicker } from "@/components/dashboard/service-area-picker";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: AccountFormState = { error: null };

export function EditProviderForm({
  provider,
  serviceTypes,
  states,
}: {
  provider: ServiceProvider;
  serviceTypes: ServiceType[];
  states: USState[];
}) {
  const [state, formAction, pending] = useActionState(updateServiceProviderAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="providerId" value={provider.id} />

      <section className="space-y-4">
        <h2 className="font-heading text-sm font-semibold text-slate">Provider details</h2>

        <div>
          <label className={labelClass} htmlFor="companyName">
            Company name
          </label>
          <input
            id="companyName"
            name="companyName"
            required
            defaultValue={provider.companyName}
            className={inputClass}
          />
        </div>

        <div>
          <span className={labelClass}>Services handled</span>
          <div className="grid grid-cols-2 gap-2">
            {serviceTypes.map((st) => (
              <label key={st.key} className="font-body flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="serviceTypes"
                  value={st.key}
                  defaultChecked={provider.serviceTypes.includes(st.key)}
                  className="h-4 w-4 accent-forest"
                />
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
          <ServiceAreaPicker states={states} defaultValue={provider.serviceAreas} />
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
