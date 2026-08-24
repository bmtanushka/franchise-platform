import { notFound, redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getChatServiceDetail } from "@/lib/db/chat-services";
import { PageHeader } from "@/components/dashboard/page-header";
import { EditChatServiceForm } from "@/components/dashboard/edit-chat-service-form";

export default async function EditChatServicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };
  const { id } = await params;
  const service = await getChatServiceDetail(ctx, id);

  if (!service) {
    notFound();
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={MessageSquareText} title={`Edit ${service.name}`} />
      <EditChatServiceForm service={service} />
    </div>
  );
}
