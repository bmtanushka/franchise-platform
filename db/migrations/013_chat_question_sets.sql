-- ============================================================================
-- Admin-authored chat question sets — service_types gains corporate_only/
-- is_active, and chat_questions(+chat_question_options) become the source
-- of truth for the chat agent's per-service question flow, replacing the
-- static Python dicts in agent/app/question_sets.py. franchisor/super_admin
-- manage both through the dashboard (web/src/lib/db/chat-services.ts); the
-- agent reads them per turn (agent/app/db.py's get_questions_for_service).
--
-- Schema only — see 014_seed_chat_questions.sql for the data that
-- reproduces today's hardcoded question sets exactly.
-- ============================================================================

alter table service_types add column corporate_only boolean not null default false;
alter table service_types add column is_active boolean not null default true;
alter table service_types add column created_at timestamptz not null default now();

-- Generalizes agent/app/chat.py's hardcoded
-- `if tenant_type == "franchisor"` / key == 'franchise_interest' check
-- into a real, admin-settable column.
update service_types set corporate_only = true where key = 'franchise_interest';

create table chat_questions (
  id                uuid primary key default gen_random_uuid(),
  service_type_id   uuid not null references service_types(id) on delete cascade,
  key               text not null,
  prompt            text not null,
  field_type        text not null check (field_type in ('text', 'email', 'phone', 'boolean', 'enum')),
  lead_field        text check (lead_field in ('full_name', 'contact_email', 'contact_phone', 'postcode', 'consent_to_contact')),
  depends_on_key    text,
  depends_on_mode   text check (depends_on_mode in ('equals', 'one_of')),
  depends_on_values text[],
  position          int not null default 0,
  created_at        timestamptz not null default now(),
  unique (service_type_id, key)
);

-- depends_on_mode/depends_on_values are only meaningful alongside
-- depends_on_key — the "must reference an earlier field in the same
-- service, and only an enum/boolean one" rule is cross-row and enforced
-- app-side (web/src/lib/db/chat-services.ts), this just guards the shape.
alter table chat_questions add constraint chat_questions_depends_on_shape check (
  (depends_on_key is null and depends_on_mode is null and depends_on_values is null)
  or (depends_on_key is not null and depends_on_mode is not null and depends_on_values is not null)
);

create table chat_question_options (
  id               uuid primary key default gen_random_uuid(),
  chat_question_id uuid not null references chat_questions(id) on delete cascade,
  value            text not null,
  label            text not null,
  position         int not null default 0,
  created_at       timestamptz not null default now(),
  unique (chat_question_id, value)
);

create index idx_chat_questions_service on chat_questions(service_type_id, position);
create index idx_chat_question_options_question on chat_question_options(chat_question_id, position);
