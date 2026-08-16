"use client";

import { useEffect } from "react";
import { markLessonViewedAction } from "@/lib/actions/courses";

/** Fires once on mount to record this lesson as viewed — renders nothing. */
export function MarkLessonViewed({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    markLessonViewedAction(lessonId);
  }, [lessonId]);

  return null;
}
