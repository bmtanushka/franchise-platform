import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getChatServiceDetail, REQUIRED_SYSTEM_KEYS } from "@/lib/db/chat-services";
import { cardClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { TonePill } from "@/components/dashboard/status-badge";
import { ChatServiceActiveToggle } from "@/components/dashboard/chat-service-active-toggle";
import { DeleteChatQuestionButton } from "@/components/dashboard/delete-chat-question-button";

const FIELD_TYPE_LABEL: Record<string, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  boolean: "Yes/No",
  enum: "Multiple choice",
};

export default async function ChatServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className={pageContainerClass}>
      <div>
        <Link href="/dashboard/chat-services" className={linkClass}>
          ← Back to chat services
        </Link>
      </div>

      <PageHeader
        icon={MessageSquareText}
        title={service.name}
        description={`Key: ${service.key}`}
        action={
          <div className="flex items-center gap-2">
            {service.corporateOnly && <TonePill tone="info" label="Corporate only" />}
            <TonePill tone={service.isActive ? "success" : "neutral"} label={service.isActive ? "Active" : "Inactive"} />
            <Link href={`/dashboard/chat-services/${service.id}/edit`} className={linkClass}>
              Edit
            </Link>
            <ChatServiceActiveToggle serviceId={service.id} isActive={service.isActive} />
          </div>
        }
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-ink">Questions</h2>
          <Link href={`/dashboard/chat-services/${service.id}/questions/new`} className={linkClass}>
            Add question
          </Link>
        </div>

        <ul className={`${cardClass} divide-y divide-border`}>
          {service.questions.map((q, i) => (
            <li key={q.id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="font-body text-sm font-medium text-ink">
                  {i + 1}. {q.prompt}
                </div>
                <div className="font-body mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
                  <span className="rounded bg-sage-tint px-1.5 py-0.5 font-mono">{q.key}</span>
                  <span>{FIELD_TYPE_LABEL[q.fieldType] ?? q.fieldType}</span>
                  {q.leadField && <span>→ leads.{q.leadField}</span>}
                  {q.options.length > 0 && <span>{q.options.length} options</span>}
                  {q.dependsOnKey && (
                    <span>
                      only if <code className="font-mono">{q.dependsOnKey}</code>{" "}
                      {q.dependsOnMode === "one_of" ? "is one of" : "="} {q.dependsOnValues?.join(", ")}
                    </span>
                  )}
                  {REQUIRED_SYSTEM_KEYS.has(q.key) && <span className="italic">required</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/dashboard/chat-services/${service.id}/questions/${q.id}/edit`} className={linkClass}>
                  Edit
                </Link>
                {!REQUIRED_SYSTEM_KEYS.has(q.key) && (
                  <DeleteChatQuestionButton questionId={q.id} serviceId={service.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
