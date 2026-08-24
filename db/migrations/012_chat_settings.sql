-- Chat agent greeting, editable by franchisor/super_admin only. Two
-- templates, not per-franchisee: one for the franchisor's own corporate
-- site, one default used across every franchisee site. Singleton table —
-- always exactly one row. {tenant_name} in either template is substituted
-- with the actual tenant's name at chat-start time (agent/app/chat.py);
-- the "Which of these are you interested in: ..." services question is
-- always system-appended after the greeting, never part of the editable
-- text, so it can't drift out of sync with the real service list.
create table chat_settings (
  id                  uuid primary key default gen_random_uuid(),
  corporate_greeting  text not null,
  franchisee_greeting text not null,
  updated_at          timestamptz not null default now()
);

insert into chat_settings (corporate_greeting, franchisee_greeting) values (
  'Hi, I''m {tenant_name}''s virtual assistant. I can help connect you with the right specialist.',
  'Hi, I''m {tenant_name}''s virtual assistant. I can help connect you with the right specialist.'
);
