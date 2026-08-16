"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCourseStatusAction } from "@/lib/actions/courses";
import type { CourseStatus } from "@/lib/db/courses";
import { secondaryButtonClass } from "@/lib/dashboard-ui";

export function PublishToggleButton({ courseId, status }: { courseId: string; status: CourseStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const nextStatus: CourseStatus = status === "draft" ? "published" : "draft";

  async function handleClick() {
    setPending(true);
    const result = await updateCourseStatusAction(courseId, nextStatus);
    setPending(false);
    if (!result.error) router.refresh();
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} className={secondaryButtonClass}>
      {pending ? "Saving..." : status === "draft" ? "Publish" : "Unpublish"}
    </button>
  );
}
