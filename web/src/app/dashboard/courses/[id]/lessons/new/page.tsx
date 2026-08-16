import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { NewLessonForm } from "@/components/dashboard/new-lesson-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function NewLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const { id } = await params;

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={GraduationCap} title="Add lesson" />
      <NewLessonForm courseId={id} />
    </div>
  );
}
