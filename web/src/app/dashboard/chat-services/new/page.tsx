import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { PageHeader } from "@/components/dashboard/page-header";
import { NewChatServiceForm } from "@/components/dashboard/new-chat-service-form";

export default async function NewChatServicePage() {
  const session = await auth();
  const { role } = session!.user;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={MessageSquareText} title="Add a chat service" />
      <NewChatServiceForm />
    </div>
  );
}
