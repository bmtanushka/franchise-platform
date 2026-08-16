-- ============================================================================
-- Migration 010: course module — franchisor/super_admin author courses
-- made of lessons (video link or text), franchisees self-enroll and work
-- through them, and "viewed" is tracked per lesson per user. No RLS —
-- these tables aren't in the brief's protected set (leads/chat_messages/
-- rebates), same app-layer-only pattern already used for tenants/
-- service_providers/users.
-- ============================================================================

create table courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'draft' check (status in ('draft','published')),
  created_by  uuid references users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table lessons (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references courses(id) on delete cascade,
  title        text not null,
  content_type text not null check (content_type in ('video','text')),
  video_url    text,   -- raw pasted YouTube/Vimeo URL; parsed to an embed URL at render time
  text_content text,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create table course_enrollments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (course_id, user_id)
);

-- Presence of a row = viewed. A lesson nobody has opened yet just has no
-- row, so adding a lesson to a course after franchisees already enrolled
-- needs no backfill.
create table lesson_progress (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references lessons(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  unique (lesson_id, user_id)
);

create index idx_lessons_course on lessons(course_id);
create index idx_enrollments_course on course_enrollments(course_id);
create index idx_enrollments_user on course_enrollments(user_id);
create index idx_progress_user on lesson_progress(user_id);
