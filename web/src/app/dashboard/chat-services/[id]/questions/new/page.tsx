import { notFound, redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getChatServiceDetail } from "@/lib/db/chat-services";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChatQuestionForm, type EarlierChatQuestion } from "@/components/dashboard/chat-question-form";

export default async function NewChatQuestionPage({ params }: { params: Promise<{ id: string }> }) {
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

  const earlierQuestions: EarlierChatQuestion[] = service.questions
    .filter((q) => q.fieldType === "enum" || q.fieldType === "boolean")
    .map((q) => ({ key: q.key, prompt: q.prompt, fieldType: q.fieldType as "enum" | "boolean", options: q.options }));

  const specificFieldPositions = service.questions.map((q) => q.position).filter((p) => p < 100);
  const defaultPosition = specificFieldPositions.length > 0 ? Math.max(...specificFieldPositions) + 1 : 0;

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={MessageSquareText} title={`Add a question to ${service.name}`} />
      <ChatQuestionForm
        serviceId={service.id}
        mode="create"
        earlierQuestions={earlierQuestions}
        defaultPosition={defaultPosition}
      />
    </div>
  );
}
