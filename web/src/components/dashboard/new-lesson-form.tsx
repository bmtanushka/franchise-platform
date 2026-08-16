"use client";

import { useActionState, useState } from "react";
import { createLessonAction, type CourseFormState } from "@/lib/actions/courses";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: CourseFormState = { error: null };

export function NewLessonForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(createLessonAction, initialState);
  const [contentType, setContentType] = useState<"video" | "text">("video");

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="courseId" value={courseId} />

      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="title">
            Lesson title
          </label>
          <input id="title" name="title" required className={inputClass} />
        </div>

        <div>
          <span className={labelClass}>Content type</span>
          <div className="flex gap-4">
            <label className="font-body flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="contentType"
                value="video"
                checked={contentType === "video"}
                onChange={() => setContentType("video")}
                className="h-4 w-4 accent-forest"
              />
              Video
            </label>
            <label className="font-body flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="contentType"
                value="text"
                checked={contentType === "text"}
                onChange={() => setContentType("text")}
                className="h-4 w-4 accent-forest"
              />
              Text
            </label>
          </div>
        </div>

        {contentType === "video" ? (
          <div>
            <label className={labelClass} htmlFor="videoUrl">
              YouTube or Vimeo link
            </label>
            <input
              id="videoUrl"
              name="videoUrl"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor="textContent">
              Lesson text
            </label>
            <textarea id="textContent" name="textContent" rows={8} className={inputClass} />
          </div>
        )}
      </section>

      {state.error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Adding..." : "Add lesson"}
      </button>
    </form>
  );
}
