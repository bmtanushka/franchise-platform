"use client";

import { useActionState } from "react";
import { updateOwnFranchiseeProfileAction, type ProfileFormState } from "@/lib/actions/profile";
import type { FranchiseeProfile, SiteTemplateOption } from "@/lib/db/site-content";

const initialState: ProfileFormState = { error: null };

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";
const labelClass = "block text-sm font-medium mb-1";

export function EditOwnProfileForm({
  profile,
  templates,
  currentTemplateId,
}: {
  profile: FranchiseeProfile | null;
  templates: SiteTemplateOption[];
  currentTemplateId: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateOwnFranchiseeProfileAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-medium opacity-70">Website template</h2>
        <div>
          <label className={labelClass} htmlFor="templateId">
            Template
          </label>
          <select id="templateId" name="templateId" defaultValue={currentTemplateId ?? ""} className={inputClass}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium opacity-70">Site contact details</h2>

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

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
