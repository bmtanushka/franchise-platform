import { notFound, redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getCourseById } from "@/lib/db/courses";
import { EditCourseForm } from "@/components/dashboard/edit-course-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };
  const { id } = await params;
  const course = await getCourseById(ctx, id);

  if (!course) {
    notFound();
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={GraduationCap} title={`Edit ${course.title}`} />
      <EditCourseForm course={course} />
    </div>
  );
}
