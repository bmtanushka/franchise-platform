import { sql } from "./client";
import type { SessionContext } from "./context";

// No RLS on any of these tables — courses/lessons/enrollments/progress
// aren't in the brief's protected set (leads/chat_messages/rebates), same
// app-layer-only pattern already used for tenants/service_providers/users.
const COURSE_MANAGER_ROLES = new Set(["super_admin", "franchisor"]);

export type CourseStatus = "draft" | "published";
export type LessonContentType = "video" | "text";

export type CourseListItem = {
  id: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  lessonCount: number;
  enrolledCount: number;
  /** Only ever populated for a franchisee's own view. */
  myEnrollment: { enrolledAt: string; viewedCount: number } | null;
};

export async function listCourses(ctx: SessionContext): Promise<CourseListItem[]> {
  if (ctx.role === "franchisee") {
    const rows = await sql<
      {
        id: string;
        title: string;
        description: string | null;
        status: CourseStatus;
        lesson_count: number;
        enrolled_count: number;
        enrolled_at: string | null;
        viewed_count: number;
      }[]
    >`
      select
        c.id, c.title, c.description, c.status,
        (select count(*) from lessons l where l.course_id = c.id)::int as lesson_count,
        (select count(*) from course_enrollments e2 where e2.course_id = c.id)::int as enrolled_count,
        ce.enrolled_at,
        (
          select count(*) from lesson_progress lp
          join lessons l2 on l2.id = lp.lesson_id
          where l2.course_id = c.id and lp.user_id = ${ctx.userId}
        )::int as viewed_count
      from courses c
      left join course_enrollments ce on ce.course_id = c.id and ce.user_id = ${ctx.userId}
      where c.status = 'published'
      order by c.created_at desc
    `;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      lessonCount: r.lesson_count,
      enrolledCount: r.enrolled_count,
      myEnrollment: r.enrolled_at ? { enrolledAt: r.enrolled_at, viewedCount: r.viewed_count } : null,
    }));
  }

  if (!COURSE_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Not authorized to view courses.");
  }

  const rows = await sql<
    { id: string; title: string; description: string | null; status: CourseStatus; lesson_count: number; enrolled_count: number }[]
  >`
    select
      c.id, c.title, c.description, c.status,
      (select count(*) from lessons l where l.course_id = c.id)::int as lesson_count,
      (select count(*) from course_enrollments e where e.course_id = c.id)::int as enrolled_count
    from courses c
    order by c.created_at desc
  `;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    lessonCount: r.lesson_count,
    enrolledCount: r.enrolled_count,
    myEnrollment: null,
  }));
}

export type CreateCourseInput = { title: string; description: string | null; status: CourseStatus };

export async function createCourse(ctx: SessionContext, input: CreateCourseInput): Promise<{ courseId: string }> {
  if (!COURSE_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Only the franchisor can create courses.");
  }

  const [row] = await sql<{ id: string }[]>`
    insert into courses (title, description, status, created_by)
    values (${input.title}, ${input.description}, ${input.status}, ${ctx.userId})
    returning id
  `;
  return { courseId: row.id as string };
}

export async function updateCourseStatus(ctx: SessionContext, courseId: string, status: CourseStatus): Promise<void> {
  if (!COURSE_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Only the franchisor can update a course.");
  }

  await sql`update courses set status = ${status}, updated_at = now() where id = ${courseId}`;
}

export type LessonSummary = {
  id: string;
  title: string;
  contentType: LessonContentType;
  videoUrl: string | null;
  /** Only ever populated for a franchisee's own view. */
  viewed?: boolean;
};

export type EnrollmentRow = {
  userId: string;
  name: string;
  email: string;
  enrolledAt: string;
  viewedLessonIds: string[];
};

export type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  lessons: LessonSummary[];
  /** franchisee-only */
  isEnrolled?: boolean;
  /** franchisor/admin-only */
  enrollments?: EnrollmentRow[];
};

export async function getCourseDetail(ctx: SessionContext, courseId: string): Promise<CourseDetail | null> {
  const [course] = await sql<{ id: string; title: string; description: string | null; status: CourseStatus }[]>`
    select id, title, description, status from courses where id = ${courseId} limit 1
  `;
  if (!course) return null;

  if (ctx.role === "franchisee") {
    if (course.status !== "published") return null;

    const lessons = await sql<
      { id: string; title: string; content_type: LessonContentType; video_url: string | null; viewed: boolean }[]
    >`
      select l.id, l.title, l.content_type, l.video_url, (lp.id is not null) as viewed
      from lessons l
      left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = ${ctx.userId}
      where l.course_id = ${courseId}
      order by l.created_at asc
    `;

    const [enrollment] = await sql<{ id: string }[]>`
      select id from course_enrollments where course_id = ${courseId} and user_id = ${ctx.userId} limit 1
    `;

    return {
      ...course,
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        contentType: l.content_type,
        videoUrl: l.video_url,
        viewed: l.viewed,
      })),
      isEnrolled: !!enrollment,
    };
  }

  if (!COURSE_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Not authorized to view this course.");
  }

  const lessons = await sql<{ id: string; title: string; content_type: LessonContentType; video_url: string | null }[]>`
    select id, title, content_type, video_url from lessons where course_id = ${courseId} order by created_at asc
  `;

  const enrollmentRows = await sql<
    { user_id: string; full_name: string | null; email: string; enrolled_at: string; viewed_lesson_ids: string[] }[]
  >`
    select
      u.id as user_id, u.full_name, u.email, ce.enrolled_at,
      coalesce(
        array_agg(lp.lesson_id) filter (where lp.lesson_id is not null),
        '{}'
      ) as viewed_lesson_ids
    from course_enrollments ce
    join users u on u.id = ce.user_id
    left join lesson_progress lp
      on lp.user_id = ce.user_id
      and lp.lesson_id in (select id from lessons where course_id = ${courseId})
    where ce.course_id = ${courseId}
    group by u.id, u.full_name, u.email, ce.enrolled_at
    order by ce.enrolled_at desc
  `;

  return {
    ...course,
    lessons: lessons.map((l) => ({ id: l.id, title: l.title, contentType: l.content_type, videoUrl: l.video_url })),
    enrollments: enrollmentRows.map((r) => ({
      userId: r.user_id,
      name: r.full_name ?? r.email,
      email: r.email,
      enrolledAt: r.enrolled_at,
      viewedLessonIds: r.viewed_lesson_ids,
    })),
  };
}

export type CreateLessonInput = {
  title: string;
  contentType: LessonContentType;
  videoUrl: string | null;
  textContent: string | null;
};

export async function createLesson(
  ctx: SessionContext,
  courseId: string,
  input: CreateLessonInput,
): Promise<{ lessonId: string }> {
  if (!COURSE_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Only the franchisor can add lessons.");
  }

  const [row] = await sql<{ id: string }[]>`
    insert into lessons (course_id, title, content_type, video_url, text_content)
    values (${courseId}, ${input.title}, ${input.contentType}, ${input.videoUrl}, ${input.textContent})
    returning id
  `;
  return { lessonId: row.id as string };
}

export async function enrollInCourse(ctx: SessionContext, courseId: string): Promise<void> {
  if (ctx.role !== "franchisee" || !ctx.userId) {
    throw new Error("Only a franchisee can enroll in a course.");
  }

  await sql`
    insert into course_enrollments (course_id, user_id)
    values (${courseId}, ${ctx.userId})
    on conflict (course_id, user_id) do nothing
  `;
}

/** Best-effort — silently does nothing for roles without tracked progress (only franchisees have it). */
export async function markLessonViewed(ctx: SessionContext, lessonId: string): Promise<void> {
  if (ctx.role !== "franchisee" || !ctx.userId) return;

  await sql`
    insert into lesson_progress (lesson_id, user_id)
    values (${lessonId}, ${ctx.userId})
    on conflict (lesson_id, user_id) do nothing
  `;
}

export type LessonDetail = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  contentType: LessonContentType;
  videoUrl: string | null;
  textContent: string | null;
};

export async function getLessonDetail(ctx: SessionContext, lessonId: string): Promise<LessonDetail | null> {
  const [row] = await sql<
    {
      id: string;
      course_id: string;
      course_title: string;
      course_status: CourseStatus;
      title: string;
      content_type: LessonContentType;
      video_url: string | null;
      text_content: string | null;
    }[]
  >`
    select l.id, l.course_id, c.title as course_title, c.status as course_status,
           l.title, l.content_type, l.video_url, l.text_content
    from lessons l
    join courses c on c.id = l.course_id
    where l.id = ${lessonId}
    limit 1
  `;
  if (!row) return null;

  if (ctx.role === "franchisee") {
    if (row.course_status !== "published") return null;

    const [enrollment] = await sql<{ id: string }[]>`
      select id from course_enrollments where course_id = ${row.course_id} and user_id = ${ctx.userId} limit 1
    `;
    if (!enrollment) return null;
  } else if (!COURSE_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Not authorized to view this lesson.");
  }

  return {
    id: row.id,
    courseId: row.course_id,
    courseTitle: row.course_title,
    title: row.title,
    contentType: row.content_type,
    videoUrl: row.video_url,
    textContent: row.text_content,
  };
}
