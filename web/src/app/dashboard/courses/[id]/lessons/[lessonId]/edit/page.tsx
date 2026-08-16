import { notFound, redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getLessonDetail } from "@/lib/db/courses";
import { EditLessonForm } from "@/components/dashboard/edit-lesson-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };
  const { id, lessonId } = await params;
  const lesson = await getLessonDetail(ctx, lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={GraduationCap} title={`Edit ${lesson.title}`} />
      <EditLessonForm courseId={id} lesson={lesson} />
    </div>
  );
}
