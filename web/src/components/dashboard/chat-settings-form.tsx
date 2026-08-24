"use client";

import { useActionState } from "react";
import { updateChatSettingsAction, type ChatSettingsFormState } from "@/lib/actions/chat-settings";
import type { ChatSettings } from "@/lib/db/chat-settings";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: ChatSettingsFormState = { error: null };

export function ChatSettingsForm({ settings }: { settings: ChatSettings }) {
  const [state, formAction, pending] = useActionState(updateChatSettingsAction, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="corporateGreeting">
            Corporate site greeting
          </label>
          <textarea
            id="corporateGreeting"
            name="corporateGreeting"
            required
            rows={3}
            defaultValue={settings.corporateGreeting}
            className={inputClass}
          />
          <p className="font-body mt-1 text-xs text-slate">
            Shown when the chat opens on the franchisor&apos;s own corporate site.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="franchiseeGreeting">
            Franchisee site greeting
          </label>
          <textarea
            id="franchiseeGreeting"
            name="franchiseeGreeting"
            required
            rows={3}
            defaultValue={settings.franchiseeGreeting}
            className={inputClass}
          />
          <p className="font-body mt-1 text-xs text-slate">
            Shown when the chat opens on any franchisee&apos;s site — the same text for every
            franchisee, not customizable per franchisee.
          </p>
        </div>

        <div className="rounded-md bg-sage-tint/60 px-3 py-2">
          <p className="font-body text-xs text-slate">
            Use <code className="font-mono text-ink">{"{tenant_name}"}</code> anywhere you want the
            tenant&apos;s actual name substituted in. Whatever you type here is shown exactly as
            written — a &quot;Which of these are you interested in: ...&quot; question listing the
            available services is always added automatically right after it, so don&apos;t include
            that part yourself.
          </p>
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
