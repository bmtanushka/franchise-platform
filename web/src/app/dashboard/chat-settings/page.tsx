import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getChatSettings } from "@/lib/db/chat-settings";
import { pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChatSettingsForm } from "@/components/dashboard/chat-settings-form";

export default async function ChatSettingsPage() {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };
  const settings = await getChatSettings(ctx);

  return (
    <div className={pageContainerClass}>
      <PageHeader
        icon={MessageCircle}
        title="Chat greeting"
        description="What the chat agent says when a visitor first opens it."
      />
      <ChatSettingsForm settings={settings} />
    </div>
  );
}
