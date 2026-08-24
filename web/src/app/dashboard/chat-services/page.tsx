import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { listChatServices } from "@/lib/db/chat-services";
import { cardClass, primaryButtonClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityRow } from "@/components/dashboard/entity-row";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TonePill } from "@/components/dashboard/status-badge";

export default async function ChatServicesPage() {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };
  const services = await listChatServices(ctx);
  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className={pageContainerClass}>
      <PageHeader
        icon={MessageSquareText}
        title="Chat services"
        description="The services the chat agent offers, and the questions it asks for each."
        action={
          <Link href="/dashboard/chat-services/new" className={primaryButtonClass}>
            Add service
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Services" value={String(services.length)} />
        <StatTile label="Active" value={String(activeCount)} />
      </div>

      <ul className={`${cardClass} divide-y divide-border`}>
        {services.map((s) => (
          <EntityRow
            key={s.id}
            name={s.name}
            meta={`${s.key} · ${s.questionCount} question${s.questionCount === 1 ? "" : "s"}`}
            status={
              <div className="flex items-center gap-2">
                {s.corporateOnly && <TonePill tone="info" label="Corporate only" />}
                <TonePill tone={s.isActive ? "success" : "neutral"} label={s.isActive ? "Active" : "Inactive"} />
              </div>
            }
            action={
              <Link href={`/dashboard/chat-services/${s.id}`} className={`${linkClass} ml-2`}>
                View
              </Link>
            }
          />
        ))}
      </ul>
    </div>
  );
}
