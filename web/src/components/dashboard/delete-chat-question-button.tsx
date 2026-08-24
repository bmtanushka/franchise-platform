"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteChatQuestionAction } from "@/lib/actions/chat-services";
import { linkClass } from "@/lib/dashboard-ui";

export function DeleteChatQuestionButton({ questionId, serviceId }: { questionId: string; serviceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm("Delete this question?")) return;
    setPending(true);
    setError(null);
    const result = await deleteChatQuestionAction(questionId, serviceId);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleClick} disabled={pending} className={`${linkClass} shrink-0`}>
        {pending ? "Deleting..." : "Delete"}
      </button>
      {error && <span className="font-body text-xs text-error-text">{error}</span>}
    </div>
  );
}
