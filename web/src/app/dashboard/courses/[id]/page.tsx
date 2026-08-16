import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GraduationCap, Video, FileText, Check } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getCourseDetail } from "@/lib/db/courses";
import { cardClass, primaryButtonClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { CourseStatusBadge } from "@/components/dashboard/status-badge";
import { PublishToggleButton } from "@/components/dashboard/publish-toggle-button";
import { EnrollButton } from "@/components/dashboard/enroll-button";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;
  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };

  if (role === "service_provider") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const course = await getCourseDetail(ctx, id);

  if (!course) {
    notFound();
  }

  const isManager = role === "super_admin" || role === "franchisor";

  return (
    <div className={pageContainerClass}>
      <div>
        <Link href="/dashboard/courses" className={linkClass}>
          ← Back to courses
        </Link>
      </div>

      <PageHeader
        icon={GraduationCap}
        title={course.title}
        description={course.description ?? undefined}
        action={
          isManager ? (
            <div className="flex items-center gap-2">
              <CourseStatusBadge status={course.status} />
              <Link href={`/dashboard/courses/${course.id}/edit`} className={linkClass}>
                Edit
              </Link>
              <PublishToggleButton courseId={course.id} status={course.status} />
            </div>
          ) : undefined
        }
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-ink">Lessons</h2>
          {isManager && (
            <Link href={`/dashboard/courses/${course.id}/lessons/new`} className={linkClass}>
              Add lesson
            </Link>
          )}
        </div>

        {course.lessons.length === 0 ? (
          <div className={`${cardClass} p-6 text-center`}>
            <p className="font-body text-sm text-slate">No lessons yet.</p>
          </div>
        ) : (
          <ul className={`${cardClass} divide-y divide-border`}>
            {course.lessons.map((lesson, i) => {
              const canOpen = isManager || course.isEnrolled;
              const content = (
                <>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-tint text-forest">
                    {lesson.contentType === "video" ? <Video size={15} /> : <FileText size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-body text-sm font-medium text-ink">
                      {i + 1}. {lesson.title}
                    </div>
                  </div>
                  {lesson.viewed && (
                    <span className="flex items-center gap-1 text-xs text-success-text">
                      <Check size={14} /> Viewed
                    </span>
                  )}
                </>
              );
              return (
                <li key={lesson.id} className="flex items-center gap-3 px-4 py-3.5">
                  {canOpen ? (
                    <Link
                      href={`/dashboard/courses/${course.id}/lessons/${lesson.id}`}
                      className="flex flex-1 items-center gap-3 transition-colors hover:text-moss"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex flex-1 items-center gap-3 opacity-60">{content}</div>
                  )}
                  {isManager && (
                    <Link
                      href={`/dashboard/courses/${course.id}/lessons/${lesson.id}/edit`}
                      className={`${linkClass} shrink-0`}
                    >
                      Edit
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!isManager && !course.isEnrolled && (
        <div className={`${cardClass} flex items-center justify-between p-4`}>
          <p className="font-body text-sm text-ink">Enroll to start this course and track your progress.</p>
          <EnrollButton courseId={course.id} />
        </div>
      )}

      {isManager && course.enrollments && (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">Enrollment</h2>
          {course.enrollments.length === 0 ? (
            <div className={`${cardClass} p-6 text-center`}>
              <p className="font-body text-sm text-slate">No one has enrolled yet.</p>
            </div>
          ) : (
            <div className={`${cardClass} overflow-x-auto`}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-sage-tint/60">
                    <th className="px-4 py-2.5 text-left font-body text-xs font-semibold uppercase tracking-[0.03em] text-slate">
                      Franchisee
                    </th>
                    {course.lessons.map((lesson, i) => (
                      <th
                        key={lesson.id}
                        className="px-3 py-2.5 text-center font-body text-xs font-semibold uppercase tracking-[0.03em] text-slate"
                        title={lesson.title}
                      >
                        L{i + 1}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right font-body text-xs font-semibold uppercase tracking-[0.03em] text-slate">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {course.enrollments.map((e) => {
                    const viewedCount = course.lessons.filter((l) => e.viewedLessonIds.includes(l.id)).length;
                    return (
                      <tr key={e.userId} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-body text-sm font-medium text-ink">{e.name}</div>
                          <div className="font-body text-xs text-slate">{e.email}</div>
                        </td>
                        {course.lessons.map((lesson) => (
                          <td key={lesson.id} className="px-3 py-3 text-center">
                            {e.viewedLessonIds.includes(lesson.id) ? (
                              <Check size={16} className="mx-auto text-success-text" />
                            ) : (
                              <span className="text-slate">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-ink">
                          {viewedCount}/{course.lessons.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
