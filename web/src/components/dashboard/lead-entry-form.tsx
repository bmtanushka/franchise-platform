"use client";

import { useActionState, useMemo, useState } from "react";
import { createLeadFromEntryAction, type LeadEntryFormState } from "@/lib/actions/lead-entry";
import type { LeadEntryService } from "@/lib/db/lead-entry";
import type { ChatQuestion } from "@/lib/db/chat-services";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: LeadEntryFormState = { error: null };

function isVisible(question: ChatQuestion, answers: Record<string, string>): boolean {
  if (!question.dependsOnKey || !question.dependsOnMode || !question.dependsOnValues) return true;
  const value = answers[question.dependsOnKey];
  if (question.dependsOnMode === "equals") return value === question.dependsOnValues[0];
  return question.dependsOnValues.includes(value ?? "");
}

export function LeadEntryForm({ services }: { services: LeadEntryService[] }) {
  const [state, formAction, pending] = useActionState(createLeadFromEntryAction, initialState);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);

  function setAnswer(key: string, value: string) {
    setAnswers((cur) => ({ ...cur, [key]: value }));
  }

  function handleServiceChange(id: string) {
    setServiceId(id);
    setAnswers({});
  }

  if (services.length === 0) {
    return <p className="font-body text-sm text-slate">No services are available for manual entry right now.</p>;
  }

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="serviceId" value={serviceId} />

      <div>
        <label className={labelClass} htmlFor="service">
          What is this lead for?
        </label>
        <select
          id="service"
          value={serviceId}
          onChange={(e) => handleServiceChange(e.target.value)}
          className={inputClass}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {service && (
        <section className="space-y-4">
          {service.questions.map((q) => {
            if (!isVisible(q, answers)) return null;
            const name = `answer:${q.key}`;
            const value = answers[q.key] ?? "";

            return (
              <div key={q.id}>
                <label className={labelClass} htmlFor={name}>
                  {q.prompt}
                </label>

                {q.fieldType === "boolean" ? (
                  <div className="flex gap-4">
                    <label className="font-body flex items-center gap-2 text-sm text-ink">
                      <input
                        type="radio"
                        name={name}
                        value="true"
                        required
                        checked={value === "true"}
                        onChange={() => setAnswer(q.key, "true")}
                        className="h-4 w-4 accent-forest"
                      />
                      Yes
                    </label>
                    <label className="font-body flex items-center gap-2 text-sm text-ink">
                      <input
                        type="radio"
                        name={name}
                        value="false"
                        required
                        checked={value === "false"}
                        onChange={() => setAnswer(q.key, "false")}
                        className="h-4 w-4 accent-forest"
                      />
                      No
                    </label>
                  </div>
                ) : q.fieldType === "enum" ? (
                  <div className="space-y-1">
                    {q.options.map((opt) => (
                      <label key={opt.value} className="font-body flex items-center gap-2 text-sm text-ink">
                        <input
                          type="radio"
                          name={name}
                          value={opt.value}
                          required
                          checked={value === opt.value}
                          onChange={() => setAnswer(q.key, opt.value)}
                          className="h-4 w-4 accent-forest"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    id={name}
                    name={name}
                    type={q.fieldType === "email" ? "email" : q.fieldType === "phone" ? "tel" : "text"}
                    value={value}
                    onChange={(e) => setAnswer(q.key, e.target.value)}
                    required
                    className={inputClass}
                  />
                )}
              </div>
            );
          })}
        </section>
      )}

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending || !service} className={primaryButtonClass}>
        {pending ? "Submitting..." : "Submit lead"}
      </button>
    </form>
  );
}
