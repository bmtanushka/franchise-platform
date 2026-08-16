"use client";

import { useActionState } from "react";
import { updateCourseAction, type CourseFormState } from "@/lib/actions/courses";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: CourseFormState = { error: null };

export function EditCourseForm({
  course,
}: {
  course: { id: string; title: string; description: string | null };
}) {
  const [state, formAction, pending] = useActionState(updateCourseAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="courseId" value={course.id} />

      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="title">
            Title
          </label>
          <input id="title" name="title" required defaultValue={course.title} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={course.description ?? ""}
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
