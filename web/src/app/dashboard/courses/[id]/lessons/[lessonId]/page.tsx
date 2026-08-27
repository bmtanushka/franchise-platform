import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { auth } from "@/lib/auth/config";
import { getLessonDetail } from "@/lib/db/courses";
import { toEmbedUrl } from "@/lib/video-embed";
import { cardClass, linkClass, pageContainerClass } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { MarkLessonViewed } from "@/components/dashboard/mark-lesson-viewed";
import { Video, FileText } from "lucide-react";

export default async function LessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const session = await auth();
  const { role, tenantId, providerId, id: userId } = session!.user;

  if (role === "service_provider") {
    redirect("/dashboard");
  }

  const ctx = { role, tenantId: tenantId ?? null, providerId: providerId ?? null, userId };

  const { id, lessonId } = await params;
  const lesson = await getLessonDetail(ctx, lessonId);

  if (!lesson) {
    notFound();
  }

  const embedUrl = lesson.contentType === "video" && lesson.videoUrl ? toEmbedUrl(lesson.videoUrl) : null;
  const sanitizedContent = lesson.textContent ? DOMPurify.sanitize(lesson.textContent) : null;

  return (
    <div className={pageContainerClass}>
      {role === "franchisee" && <MarkLessonViewed lessonId={lesson.id} />}

      <div>
        <Link href={`/dashboard/courses/${id}`} className={linkClass}>
          ← Back to {lesson.courseTitle}
        </Link>
      </div>

      <PageHeader icon={lesson.contentType === "video" ? Video : FileText} title={lesson.title} />

      <div className={`${cardClass} p-6`}>
        {lesson.contentType === "video" ? (
          <div className="space-y-4">
            {embedUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-md">
                <iframe
                  src={embedUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-body text-sm text-slate">
                  This video link couldn&apos;t be embedded automatically.
                </p>
                {lesson.videoUrl && (
                  <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className={linkClass}>
                    Watch video ↗
                  </a>
                )}
              </div>
            )}
            {sanitizedContent && (
              <div className="border-t border-border pt-4">
                <h2 className="font-heading mb-2 text-sm font-semibold text-ink">Notes</h2>
                <div
                  className="font-body prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-ink"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className="font-body prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-ink"
            dangerouslySetInnerHTML={{ __html: sanitizedContent ?? "" }}
          />
        )}
      </div>
    </div>
  );
}
