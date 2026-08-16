import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { listCourses } from "@/lib/db/courses";
import { cardClass, primaryButtonClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityRow } from "@/components/dashboard/entity-row";
import { StatTile } from "@/components/dashboard/stat-tile";
import { CourseStatusBadge } from "@/components/dashboard/status-badge";
import { EnrollButton } from "@/components/dashboard/enroll-button";

export default async function CoursesPage() {
  const session = await auth();
  const { role, tenantId, providerId, id } = session!.user;

  if (role === "service_provider") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId: id };

  const courses = await listCourses(ctx);
  const isManager = role === "super_admin" || role === "franchisor";

  if (isManager) {
    const publishedCount = courses.filter((c) => c.status === "published").length;
    return (
      <div className={pageContainerClass}>
        <PageHeader
          icon={GraduationCap}
          title="Courses"
          description="Training courses for franchisees — create courses, add lessons, and see who's enrolled."
          action={
            <Link href="/dashboard/courses/new" className={primaryButtonClass}>
              Add course
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Courses" value={String(courses.length)} />
          <StatTile label="Published" value={String(publishedCount)} />
        </div>

        {courses.length === 0 ? (
          <div className={`${cardClass} p-8 text-center`}>
            <p className="font-body text-sm text-slate">No courses yet — add one to start training franchisees.</p>
          </div>
        ) : (
          <ul className={`${cardClass} divide-y divide-border`}>
            {courses.map((c) => (
              <EntityRow
                key={c.id}
                name={c.title}
                meta={`${c.lessonCount} lesson${c.lessonCount === 1 ? "" : "s"} · ${c.enrolledCount} enrolled`}
                status={<CourseStatusBadge status={c.status} />}
                action={
                  <Link href={`/dashboard/courses/${c.id}`} className={`${linkClass} ml-2`}>
                    Manage
                  </Link>
                }
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  // franchisee
  return (
    <div className={pageContainerClass}>
      <PageHeader icon={GraduationCap} title="Courses" description="Training courses available to you." />

      {courses.length === 0 ? (
        <div className={`${cardClass} p-8 text-center`}>
          <p className="font-body text-sm text-slate">No courses are available yet.</p>
        </div>
      ) : (
        <ul className={`${cardClass} divide-y divide-border`}>
          {courses.map((c) => (
            <EntityRow
              key={c.id}
              name={c.title}
              meta={
                c.myEnrollment
                  ? `${c.myEnrollment.viewedCount}/${c.lessonCount} lessons viewed`
                  : `${c.lessonCount} lesson${c.lessonCount === 1 ? "" : "s"}`
              }
              action={
                c.myEnrollment ? (
                  <Link href={`/dashboard/courses/${c.id}`} className={`${linkClass} ml-2`}>
                    Continue
                  </Link>
                ) : (
                  <EnrollButton courseId={c.id} />
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
