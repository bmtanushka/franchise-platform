"use client";

import { useActionState, useState } from "react";
import { createFranchiseeAction, type AccountFormState } from "@/lib/actions/accounts";

const initialState: AccountFormState = { error: null };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";
const labelClass = "block text-sm font-medium mb-1";

export function NewFranchiseeForm() {
  const [state, formAction, pending] = useActionState(createFranchiseeAction, initialState);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-medium opacity-70">Franchise details</h2>

        <div>
          <label className={labelClass} htmlFor="name">
            Business name
          </label>
          <input
            id="name"
            name="name"
            required
            className={inputClass}
            onChange={(e) => {
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="slug">
            Subdomain slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={inputClass}
          />
          <p className="mt-1 text-xs opacity-60">Used for their site, e.g. {slug || "denver"}.franchiseenetwork.com</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue="active" className={inputClass}>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium opacity-70">Site contact details (shown on their public site)</h2>

        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Public contact email
          </label>
          <input id="email" name="email" type="email" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="address">
            Address
          </label>
          <input id="address" name="address" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="businessHours">
            Business hours
          </label>
          <input id="businessHours" name="businessHours" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="localBlurb">
            Local blurb
          </label>
          <textarea id="localBlurb" name="localBlurb" rows={3} className={inputClass} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium opacity-70">Owner login</h2>

        <div>
          <label className={labelClass} htmlFor="ownerFullName">
            Owner full name
          </label>
          <input id="ownerFullName" name="ownerFullName" required className={inputClass} />
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
          <p className="mt-1 text-xs opacity-60">Share this with the owner directly — it isn&apos;t emailed automatically.</p>
        </div>
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Creating..." : "Create franchisee"}
      </button>
    </form>
  );
}
