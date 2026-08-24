"use client";

import { useActionState, useMemo, useState } from "react";
import { createChatQuestionAction, updateChatQuestionAction, type ChatServiceFormState } from "@/lib/actions/chat-services";
import type { ChatQuestion, ChatQuestionOption, QuestionFieldType, LeadFieldOption } from "@/lib/db/chat-services";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: ChatServiceFormState = { error: null };

const FIELD_TYPE_OPTIONS: { value: QuestionFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "boolean", label: "Yes/No" },
  { value: "enum", label: "Multiple choice" },
];

const LEAD_FIELD_CHOICES: { value: LeadFieldOption | ""; label: string }[] = [
  { value: "", label: "None — store in this lead's collected details" },
  { value: "full_name", label: "Full name" },
  { value: "contact_email", label: "Contact email" },
  { value: "contact_phone", label: "Contact phone" },
  { value: "postcode", label: "Postcode" },
  { value: "consent_to_contact", label: "Consent to contact" },
];

export type EarlierChatQuestion = {
  key: string;
  prompt: string;
  fieldType: "boolean" | "enum";
  options: ChatQuestionOption[];
};

export function ChatQuestionForm({
  serviceId,
  mode,
  question,
  earlierQuestions,
  defaultPosition,
}: {
  serviceId: string;
  mode: "create" | "edit";
  question?: ChatQuestion;
  earlierQuestions: EarlierChatQuestion[];
  defaultPosition: number;
}) {
  const action = mode === "create" ? createChatQuestionAction : updateChatQuestionAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [fieldType, setFieldType] = useState<QuestionFieldType>(question?.fieldType ?? "text");
  const [options, setOptions] = useState<ChatQuestionOption[]>(question?.options ?? []);

  const [dependsOnEnabled, setDependsOnEnabled] = useState(!!question?.dependsOnKey);
  const [dependsOnKey, setDependsOnKey] = useState(question?.dependsOnKey ?? "");
  const [dependsOnMode, setDependsOnMode] = useState<"equals" | "one_of">(question?.dependsOnMode ?? "equals");
  const [dependsOnValues, setDependsOnValues] = useState<string[]>(question?.dependsOnValues ?? []);

  const dependsOnTarget = useMemo(
    () => earlierQuestions.find((q) => q.key === dependsOnKey) ?? null,
    [earlierQuestions, dependsOnKey],
  );

  const dependsOnPayload = dependsOnEnabled && dependsOnTarget
    ? JSON.stringify({ key: dependsOnKey, mode: dependsOnMode, values: dependsOnValues })
    : "";

  function updateOption(index: number, field: "value" | "label", value: string) {
    setOptions((cur) => cur.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }

  function removeOption(index: number) {
    const removedValue = options[index]?.value;
    setOptions((cur) => cur.filter((_, i) => i !== index));
    setDependsOnValues((cur) => cur.filter((v) => v !== removedValue));
  }

  function toggleDependsOnValue(value: string, checked: boolean) {
    if (dependsOnMode === "equals") {
      setDependsOnValues(checked ? [value] : []);
    } else {
      setDependsOnValues((cur) => (checked ? [...cur, value] : cur.filter((v) => v !== value)));
    }
  }

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="serviceId" value={serviceId} />
      {mode === "edit" && question && <input type="hidden" name="questionId" value={question.id} />}
      <input type="hidden" name="options" value={fieldType === "enum" ? JSON.stringify(options) : ""} />
      <input type="hidden" name="dependsOn" value={dependsOnPayload} />

      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="key">
            Key
          </label>
          <input
            id="key"
            name="key"
            required
            defaultValue={question?.key}
            readOnly={mode === "edit"}
            className={`${inputClass} ${mode === "edit" ? "bg-sage-tint/40" : ""}`}
            placeholder="e.g. preferred_contact_time"
          />
          <p className="font-body mt-1 text-xs text-slate">
            {mode === "edit"
              ? "Can't be changed once created — other questions may depend on it."
              : "How this answer is stored — lowercase, no spaces (use underscores)."}
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="prompt">
            Question
          </label>
          <textarea id="prompt" name="prompt" required rows={2} defaultValue={question?.prompt} className={inputClass} />
        </div>

        <div>
          <span className={labelClass}>Answer type</span>
          <div className="flex flex-wrap gap-4">
            {FIELD_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="font-body flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="fieldType"
                  value={opt.value}
                  checked={fieldType === opt.value}
                  onChange={() => setFieldType(opt.value)}
                  className="h-4 w-4 accent-forest"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {fieldType === "enum" && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <span className={labelClass}>Options</span>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt.value}
                  onChange={(e) => updateOption(i, "value", e.target.value)}
                  placeholder="stored value"
                  className={`${inputClass} font-mono text-xs`}
                />
                <input
                  value={opt.label}
                  onChange={(e) => updateOption(i, "label", e.target.value)}
                  placeholder="shown to the visitor"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="font-body shrink-0 text-xs text-error-text underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOptions((cur) => [...cur, { value: "", label: "" }])}
              className="font-body text-xs text-moss underline"
            >
              + Add option
            </button>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="leadField">
            Store as
          </label>
          <select id="leadField" name="leadField" defaultValue={question?.leadField ?? ""} className={inputClass}>
            {LEAD_FIELD_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="position">
            Order
          </label>
          <input
            id="position"
            name="position"
            type="number"
            defaultValue={question?.position ?? defaultPosition}
            className={inputClass}
          />
          <p className="font-body mt-1 text-xs text-slate">Lower numbers are asked first.</p>
        </div>

        {earlierQuestions.length > 0 && (
          <div className="space-y-3 rounded-md border border-border p-3">
            <label className="font-body flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={dependsOnEnabled}
                onChange={(e) => setDependsOnEnabled(e.target.checked)}
                className="h-4 w-4 accent-forest"
              />
              Only ask this depending on another answer
            </label>

            {dependsOnEnabled && (
              <>
                <div>
                  <label className={labelClass} htmlFor="dependsOnKey">
                    Depends on
                  </label>
                  <select
                    id="dependsOnKey"
                    value={dependsOnKey}
                    onChange={(e) => {
                      setDependsOnKey(e.target.value);
                      setDependsOnValues([]);
                    }}
                    className={inputClass}
                  >
                    <option value="">Select a question...</option>
                    {earlierQuestions.map((q) => (
                      <option key={q.key} value={q.key}>
                        {q.prompt}
                      </option>
                    ))}
                  </select>
                </div>

                {dependsOnTarget && (
                  <>
                    <div className="flex gap-4">
                      <label className="font-body flex items-center gap-2 text-sm text-ink">
                        <input
                          type="radio"
                          checked={dependsOnMode === "equals"}
                          onChange={() => {
                            setDependsOnMode("equals");
                            setDependsOnValues((cur) => cur.slice(0, 1));
                          }}
                          className="h-4 w-4 accent-forest"
                        />
                        Equals
                      </label>
                      <label className="font-body flex items-center gap-2 text-sm text-ink">
                        <input
                          type="radio"
                          checked={dependsOnMode === "one_of"}
                          onChange={() => setDependsOnMode("one_of")}
                          className="h-4 w-4 accent-forest"
                        />
                        Is one of
                      </label>
                    </div>

                    <div className="space-y-1">
                      {dependsOnTarget.fieldType === "boolean"
                        ? ["true", "false"].map((v) => (
                            <label key={v} className="font-body flex items-center gap-2 text-sm text-ink">
                              <input
                                type={dependsOnMode === "equals" ? "radio" : "checkbox"}
                                name="dependsOnValueChoice"
                                checked={dependsOnValues.includes(v)}
                                onChange={(e) => toggleDependsOnValue(v, e.target.checked)}
                                className="h-4 w-4 accent-forest"
                              />
                              {v === "true" ? "Yes" : "No"}
                            </label>
                          ))
                        : dependsOnTarget.options.map((opt) => (
                            <label key={opt.value} className="font-body flex items-center gap-2 text-sm text-ink">
                              <input
                                type={dependsOnMode === "equals" ? "radio" : "checkbox"}
                                name="dependsOnValueChoice"
                                checked={dependsOnValues.includes(opt.value)}
                                onChange={(e) => toggleDependsOnValue(opt.value, e.target.checked)}
                                className="h-4 w-4 accent-forest"
                              />
                              {opt.label}
                            </label>
                          ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Saving..." : mode === "create" ? "Add question" : "Save changes"}
      </button>
    </form>
  );
}
