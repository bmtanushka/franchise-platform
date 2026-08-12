"use client";

import { useActionState } from "react";
import { updateFranchiseeAdminAction, type AccountFormState } from "@/lib/actions/accounts";
import type { FranchiseeProfile, SiteTemplateOption } from "@/lib/db/site-content";
import type { Tenant } from "@/lib/db/tenants";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: AccountFormState = { error: null };

export function EditFranchiseeAdminForm({
  tenant,
  profile,
  templates,
}: {
  tenant: Tenant;
  profile: FranchiseeProfile | null;
  templates: SiteTemplateOption[];
}) {
  const [state, formAction, pending] = useActionState(updateFranchiseeAdminAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="tenantId" value={tenant.id} />

      <section className="space-y-4">
        <h2 className="font-heading text-sm font-semibold text-slate">Franchise details</h2>

        <div>
          <label className={labelClass} htmlFor="name">
            Business name
          </label>
          <input id="name" name="name" required defaultValue={tenant.name} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="slug">
            Subdomain slug
          </label>
          <input id="slug" name="slug" required defaultValue={tenant.slug} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={tenant.status} className={inputClass}>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="templateId">
            Website template
          </label>
          <select id="templateId" name="templateId" defaultValue={tenant.templateId ?? ""} className={inputClass}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-sm font-semibold text-slate">Site contact details</h2>

        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" defaultValue={profile?.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Public contact email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={profile?.email ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="address">
            Address
          </label>
          <input id="address" name="address" defaultValue={profile?.address ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="businessHours">
            Business hours
          </label>
          <input
            id="businessHours"
            name="businessHours"
            defaultValue={profile?.businessHours ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="localBlurb">
            Local blurb
          </label>
          <textarea
            id="localBlurb"
            name="localBlurb"
            rows={3}
            defaultValue={profile?.localBlurb ?? ""}
            className={inputClass}
          />
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
