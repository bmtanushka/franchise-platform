import { notFound, redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getChatServiceDetail } from "@/lib/db/chat-services";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChatQuestionForm, type EarlierChatQuestion } from "@/components/dashboard/chat-question-form";

export default async function EditChatQuestionPage({
  params,
}: {
  params: Promise<{ id: string; qid: string }>;
}) {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };
  const { id, qid } = await params;
  const service = await getChatServiceDetail(ctx, id);

  if (!service) {
    notFound();
  }

  const question = service.questions.find((q) => q.id === qid);
  if (!question) {
    notFound();
  }

  const earlierQuestions: EarlierChatQuestion[] = service.questions
    .filter((q) => q.id !== qid && (q.fieldType === "enum" || q.fieldType === "boolean"))
    .map((q) => ({ key: q.key, prompt: q.prompt, fieldType: q.fieldType as "enum" | "boolean", options: q.options }));

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={MessageSquareText} title={`Edit question — ${service.name}`} />
      <ChatQuestionForm
        serviceId={service.id}
        mode="edit"
        question={question}
        earlierQuestions={earlierQuestions}
        defaultPosition={question.position}
      />
    </div>
  );
}
