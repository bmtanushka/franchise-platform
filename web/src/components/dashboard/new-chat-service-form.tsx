"use client";

import { useActionState } from "react";
import { createChatServiceAction, type ChatServiceFormState } from "@/lib/actions/chat-services";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: ChatServiceFormState = { error: null };

export function NewChatServiceForm() {
  const [state, formAction, pending] = useActionState(createChatServiceAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="name">
            Service name
          </label>
          <input id="name" name="name" required className={inputClass} placeholder="e.g. Equipment Leasing" />
          <p className="font-body mt-1 text-xs text-slate">
            Shown to visitors in the chat, and everywhere else in the dashboard. A new service starts with
            4 required questions (name, email, phone, consent) — add your own after creating it.
          </p>
        </div>

        <label className="font-body flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="corporateOnly" className="h-4 w-4 accent-forest" />
          Only offer this on the franchisor&apos;s corporate site
        </label>
      </section>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Creating..." : "Create service"}
      </button>
    </form>
  );
}
