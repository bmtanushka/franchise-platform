"use client";

import { useActionState } from "react";
import { createCourseAction, type CourseFormState } from "@/lib/actions/courses";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: CourseFormState = { error: null };

export function NewCourseForm() {
  const [state, formAction, pending] = useActionState(createCourseAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="title">
            Title
          </label>
          <input id="title" name="title" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" rows={3} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue="draft" className={inputClass}>
            <option value="draft">Draft — not visible to franchisees yet</option>
            <option value="published">Published — franchisees can enroll</option>
          </select>
        </div>
      </section>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Creating..." : "Create course"}
      </button>
    </form>
  );
}
