"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionContext } from "@/lib/auth/session-context";
import {
  createCourse,
  updateCourse,
  updateCourseStatus,
  createLesson,
  updateLesson,
  enrollInCourse,
  markLessonViewed,
  type CourseStatus,
  type LessonContentType,
} from "@/lib/db/courses";

export type CourseFormState = { error: string | null };

function optionalString(value: FormDataEntryValue | null): string | null {
  const str = value ? String(value).trim() : "";
  return str.length > 0 ? str : null;
}

// The rich text editor always submits at least an empty paragraph
// (e.g. "<p></p>"), not an empty string — strip tags before treating it
// as blank so "required" validation and "no notes given" both work.
function optionalHtml(value: FormDataEntryValue | null): string | null {
  const raw = value ? String(value) : "";
  const textOnly = raw.replace(/<[^>]*>/g, "").trim();
  return textOnly.length > 0 ? raw.trim() : null;
}

export async function createCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const ctx = await requireSessionContext();
  const status = String(formData.get("status"));

  if (status !== "draft" && status !== "published") {
    return { error: "Select a status." };
  }

  let courseId: string;
  try {
    const result = await createCourse(ctx, {
      title: String(formData.get("title")).trim(),
      description: optionalString(formData.get("description")),
      status,
    });
    courseId = result.courseId;
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Something went wrong creating this course. Please try again." };
  }

  revalidatePath("/dashboard/courses");
  redirect(`/dashboard/courses/${courseId}`);
}

export async function updateCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const ctx = await requireSessionContext();
  const courseId = String(formData.get("courseId"));

  try {
    await updateCourse(ctx, courseId, {
      title: String(formData.get("title")).trim(),
      description: optionalString(formData.get("description")),
    });
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Something went wrong saving this course. Please try again." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}`);
}

// Video lessons may optionally carry rich-text notes shown below the
// embed; text lessons require it, since it's their only content.
function extractLessonFields(formData: FormData): { contentType: LessonContentType; videoUrl: string | null; textContent: string | null } | { error: string } {
  const contentType = String(formData.get("contentType"));
  if (contentType !== "video" && contentType !== "text") {
    return { error: "Select a content type." };
  }

  const videoUrl = optionalString(formData.get("videoUrl"));
  const textContent = optionalHtml(formData.get("textContent"));

  if (contentType === "video" && !videoUrl) {
    return { error: "Enter a YouTube or Vimeo link." };
  }
  if (contentType === "text" && !textContent) {
    return { error: "Enter the lesson text." };
  }

  return { contentType, videoUrl: contentType === "video" ? videoUrl : null, textContent };
}

export async function createLessonAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const ctx = await requireSessionContext();
  const courseId = String(formData.get("courseId"));

  const fields = extractLessonFields(formData);
  if ("error" in fields) return { error: fields.error };

  try {
    await createLesson(ctx, courseId, { title: String(formData.get("title")).trim(), ...fields });
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Something went wrong adding this lesson. Please try again." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}`);
}

export async function updateLessonAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const ctx = await requireSessionContext();
  const courseId = String(formData.get("courseId"));
  const lessonId = String(formData.get("lessonId"));

  const fields = extractLessonFields(formData);
  if ("error" in fields) return { error: fields.error };

  try {
    await updateLesson(ctx, lessonId, { title: String(formData.get("title")).trim(), ...fields });
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Something went wrong saving this lesson. Please try again." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}`);
}

// Plain-function actions (not <form> submissions) — same non-redirecting
// pattern as the kanban board's moveLeadStatusAction, called directly from
// client components and reporting {error} instead of navigating.

export async function updateCourseStatusAction(courseId: string, status: CourseStatus): Promise<{ error: string | null }> {
  const ctx = await requireSessionContext();
  try {
    await updateCourseStatus(ctx, courseId, status);
    revalidatePath(`/dashboard/courses/${courseId}`);
    revalidatePath("/dashboard/courses");
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update course." };
  }
}

export async function enrollInCourseAction(courseId: string): Promise<{ error: string | null }> {
  const ctx = await requireSessionContext();
  try {
    await enrollInCourse(ctx, courseId);
    revalidatePath(`/dashboard/courses/${courseId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to enroll." };
  }
}

export async function markLessonViewedAction(lessonId: string): Promise<void> {
  const ctx = await requireSessionContext();
  await markLessonViewed(ctx, lessonId);
}
