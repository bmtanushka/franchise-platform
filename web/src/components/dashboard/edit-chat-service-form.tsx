"use client";

import { useActionState } from "react";
import { updateChatServiceAction, type ChatServiceFormState } from "@/lib/actions/chat-services";
import type { ChatService } from "@/lib/db/chat-services";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: ChatServiceFormState = { error: null };

export function EditChatServiceForm({ service }: { service: ChatService }) {
  const [state, formAction, pending] = useActionState(updateChatServiceAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="serviceId" value={service.id} />

      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="name">
            Service name
          </label>
          <input id="name" name="name" required defaultValue={service.name} className={inputClass} />
          <p className="font-body mt-1 text-xs text-slate">
            Key <code className="font-mono">{service.key}</code> can&apos;t be changed once created.
          </p>
        </div>

        <label className="font-body flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="corporateOnly"
            defaultChecked={service.corporateOnly}
            className="h-4 w-4 accent-forest"
          />
          Only offer this on the franchisor&apos;s corporate site
        </label>
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
