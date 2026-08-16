"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enrollInCourseAction } from "@/lib/actions/courses";
import { primaryButtonClass } from "@/lib/dashboard-ui";

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    const result = await enrollInCourseAction(courseId);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="font-body text-xs text-error-text">{error}</span>}
      <button type="button" onClick={handleClick} disabled={pending} className={`${primaryButtonClass} !px-3 !py-1.5 !text-xs`}>
        {pending ? "Enrolling..." : "Enroll"}
      </button>
    </div>
  );
}
