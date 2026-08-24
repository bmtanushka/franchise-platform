"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleChatServiceActiveAction } from "@/lib/actions/chat-services";
import { secondaryButtonClass } from "@/lib/dashboard-ui";

export function ChatServiceActiveToggle({ serviceId, isActive }: { serviceId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const result = await toggleChatServiceActiveAction(serviceId);
    setPending(false);
    if (!result.error) router.refresh();
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} className={secondaryButtonClass}>
      {pending ? "Saving..." : isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
