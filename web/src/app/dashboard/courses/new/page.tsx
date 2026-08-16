import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { NewCourseForm } from "@/components/dashboard/new-course-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function NewCoursePage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== "super_admin" && role !== "franchisor") {
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <PageHeader icon={GraduationCap} title="Add course" />
      <NewCourseForm />
    </div>
  );
}
