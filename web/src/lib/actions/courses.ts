"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionContext } from "@/lib/auth/session-context";
import {
  createCourse,
  updateCourseStatus,
  createLesson,
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

export async function createLessonAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const ctx = await requireSessionContext();
  const courseId = String(formData.get("courseId"));
  const contentType = String(formData.get("contentType"));

  if (contentType !== "video" && contentType !== "text") {
    return { error: "Select a content type." };
  }

  const videoUrl = optionalString(formData.get("videoUrl"));
  const textContent = optionalString(formData.get("textContent"));

  if (contentType === "video" && !videoUrl) {
    return { error: "Enter a YouTube or Vimeo link." };
  }
  if (contentType === "text" && !textContent) {
    return { error: "Enter the lesson text." };
  }

  try {
    await createLesson(ctx, courseId, {
      title: String(formData.get("title")).trim(),
      contentType: contentType as LessonContentType,
      videoUrl: contentType === "video" ? videoUrl : null,
      textContent: contentType === "text" ? textContent : null,
    });
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Something went wrong adding this lesson. Please try again." };
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
