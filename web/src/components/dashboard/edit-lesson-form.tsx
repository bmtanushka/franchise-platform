"use client";

import { useActionState, useState } from "react";
import { updateLessonAction, type CourseFormState } from "@/lib/actions/courses";
import { RichTextEditor } from "@/components/dashboard/rich-text-editor";
import type { LessonDetail } from "@/lib/db/courses";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/dashboard-ui";

const initialState: CourseFormState = { error: null };

export function EditLessonForm({ courseId, lesson }: { courseId: string; lesson: LessonDetail }) {
  const [state, formAction, pending] = useActionState(updateLessonAction, initialState);
  const [contentType, setContentType] = useState<"video" | "text">(lesson.contentType);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lesson.id} />

      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="title">
            Lesson title
          </label>
          <input id="title" name="title" required defaultValue={lesson.title} className={inputClass} />
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
          <>
            <div>
              <label className={labelClass} htmlFor="videoUrl">
                YouTube or Vimeo link
              </label>
              <input
                id="videoUrl"
                name="videoUrl"
                type="url"
                defaultValue={lesson.videoUrl ?? ""}
                placeholder="https://www.youtube.com/watch?v=..."
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>Notes (optional, shown below the video)</span>
              <RichTextEditor
                name="textContent"
                defaultValue={lesson.contentType === "video" ? lesson.textContent : null}
                placeholder="Add any notes for this video..."
              />
            </div>
          </>
        ) : (
          <div>
            <span className={labelClass}>Lesson text</span>
            <RichTextEditor
              name="textContent"
              defaultValue={lesson.contentType === "text" ? lesson.textContent : null}
              placeholder="Write the lesson content..."
            />
          </div>
        )}
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
