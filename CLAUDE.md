# Project brief: franchise lead-gen platform

You're helping build a multi-tenant web platform for a franchise business
in credit, mortgage, real estate, foreign national credit facilities, and
business credit. This file defines the architecture, data model, and
conventions to follow for every change in this repo.

## Business context

- A franchisor operates a network of franchisees. Each franchisee runs a
  local "branch" offering the same 5 services.
- Customers get connected to business service providers (credit brokers,
  mortgage brokers, real estate agents, etc.) through the platform.
- When a deal closes successfully via this pipeline, the franchisee (or in
  some cases the franchisor directly) earns a rebate. Actual rebate
  calculation and payout happen outside this system for now — the
  platform's job is just to capture the real `deal_value`, entered
  directly by the service provider who closed it, not to compute a
  rebate amount from a formula.

## User roles

| Role | Scope |
|---|---|
| `super_admin` | Full system access, all tenants |
| `franchisor` | Full access to all leads, all franchisees, all providers, all rebates |
| `franchisee` | Only their own tenant's leads, rebates, and site contact details |
| `service_provider` | Only leads explicitly assigned to them |

Authorization must be enforced in two layers:
1. **App-layer data access functions** — every DB query goes through a
   role/tenant-scoped function, never an ad-hoc query. This is the primary
   enforcement layer and the one you must follow consistently.
2. **Postgres RLS** as defense-in-depth on `leads`, `chat_messages`, and
   `rebates` (see schema below). RLS depends on `set_config('app.current_role', ...)`
   and `set_config('app.current_tenant_id', ...)` being set at the start of
   every request in one shared middleware/wrapper — never scattered
   per-route.

## Domains and multi-tenancy

The real franchisor brand is **Luna Verde** (Luna Verde Corporate / Luna
Verde Business Network), currently live at
`https://lunaverdebusinessnetwork.com/`. Its full marketing site (source:
`Web-pages/Corporate/`, a self-contained header+page+footer HTML build —
see "Franchisor corporate site" below) is now served from this app for
the franchisor tenant. DNS for the real domain hasn't been pointed at
Railway yet — production is still reached via the Railway-issued URL.

The real franchisee wildcard domain is **`lv-5.com`** (`*.lv-5.com`,
replacing the brief's `*.franchiseenetwork.com` placeholder below) —
`{slug}.lv-5.com` per franchisee, e.g. `va1.lv-5.com`. Wired up on the
Railway side (`*.lv-5.com` added as a custom domain on `web`) and DNS is
now live — `railway domain status "*.lv-5.com" --service web` shows
`Verified: yes` and a valid certificate, so franchisee subdomains resolve
for real, not just at `{slug}.localhost:3000` in local dev anymore. Every
franchisee's `{slug}.lv-5.com` row in `domains` is kept in sync
automatically on create/rename (`syncFranchiseeDomain()` in
`web/src/lib/db/accounts.ts`, delete-then-insert keyed off the tenant's
current slug) — this is separate from, and doesn't touch, that tenant's
local-dev `{slug}.localhost:3000` row.

The bare apex **`lv-5.com`** (no subdomain) is being added as a second
root domain for the franchisor tenant, alongside
`lunaverdebusinessnetwork.com` below — same tenant, just another way in.
Blocked on upgrading the Railway plan (the trial tier caps custom domains
at 1 per service, and `*.lv-5.com` already uses the only slot on `web`);
once added, its `domains` row should point at the franchisor tenant id
(`14e9cf8f-9d26-45ba-bd6d-0be3ca9548d7` as of this writing) with
`domain_type = 'root'`, same pattern as the other two root rows
(`localhost:3000`, the Railway service domain). Tenant resolution
(`getTenantByDomain` in `web/src/lib/db/tenants.ts`) matches purely on
the `host` header string — `domain_type` is descriptive metadata only,
not read by the resolution query — so no code change is needed once the
row exists.

Two root domains, both pointed at the same web service (currently
placeholders — treat as literal until real domains are provided):

- `franchisorbrand.com` — the franchisor's own site. Marketing + "find your
  local office" content. **Also runs the chat agent and captures leads
  directly** for national/online visitors — these leads are owned by the
  franchisor tenant outright, never routed to a franchisee, and the
  franchisor assigns them straight to a service provider in the relevant
  area.
- `*.franchiseenetwork.com` — wildcard subdomain, one per franchisee (e.g.
  `london.franchiseenetwork.com`). Same chat agent, but leads are owned by
  that franchisee immediately.
- Franchisees can later add their own custom domain (e.g.
  `johnsmithmortgages.co.uk`), verified via DNS TXT + CNAME, then registered
  as a domain on the Railway service. Build this as a self-service flow in
  the franchisee dashboard: submit domain → show DNS instructions → verify →
  register → go live. Manual super-admin approval is fine for v1 instead of
  full Railway API automation.

Tenant resolution happens in middleware: parse the hostname, match it
against the `domains` table (root / subdomain / custom), and inject the
resolved tenant into request context. Every downstream query is scoped by
that tenant unless the role is `super_admin` or `franchisor`.

## Site content model

Single codebase renders every tenant's site differently:

- `site_content` — franchisor's global default copy per section
  (`tenant_id = null`), with franchisee-specific overrides where present.
- `franchisee_profile` — the **only** fields a franchisee can edit
  themselves: phone, email, address, business hours, a short local blurb.
  Enforce this as a field whitelist in the API layer, not just in the UI —
  the endpoint should only ever accept these specific fields regardless of
  what's posted.
- `site_templates` — presentation only. Every template reads the same
  content model; a franchisee's `template_id` picks which layout component
  renders it. This is how we'll later support fully custom sites for
  franchisees who want one — same data, different `component_key`.

### Franchisor corporate site (Luna Verde)

The franchisor's site doesn't go through `site_content`/`StandardTemplate`
at all — it's the real, bespoke Luna Verde marketing site, supplied as
standalone HTML files (`web/src/corporate-site/`, copied from
`Web-pages/Corporate/`) built on the convention: every page = **header
partial + page-specific sections + footer partial**, all CSS inline in the
header partial, no external assets.

Serving mechanism (not React/JSX):
- `src/proxy.ts` — for a franchisor-type tenant, if the request path is
  one of the known corporate paths (`src/lib/corporate-site.ts`'s
  `PAGE_REGISTRY`), rewrites to `/corp<path>`.
- `src/app/corp/[[...slug]]/route.ts` — a Route Handler (not a page) that
  reads the registry, concatenates header+content+footer, and returns it
  as a raw `text/html` response, re-checking `tenant.type === "franchisor"`
  itself as defense in depth.

This is deliberately **not** ported to JSX: the pages are self-contained
HTML/CSS/JS (nav scroll behavior, dropdowns, rebate sliders, scroll-reveal
all live in inline `<script>` tags in the header/footer partials). A raw
HTTP response preserves that exactly; rendering the same markup through
React (e.g. via `dangerouslySetInnerHTML`) would silently drop every
`<script>` tag. Add a new corporate page by dropping the HTML file into
`web/src/corporate-site/` and adding one entry to `PAGE_REGISTRY`.

The corporate nav's "Franchisee Portal" link is redirected (in
`proxy.ts`) straight to `/login` rather than served as a static page.

## Lead lifecycle

Status pipeline: `new → qualified → assigned_to_provider → in_progress →
won / lost / disqualified`. Every status change is logged to
`lead_status_history` with who changed it and an optional note.

- Franchisee-site leads: `tenant_id` = that franchisee, set at creation.
- Franchisor-site leads: `tenant_id` = the franchisor's own tenant row
  (franchisor is just another row in `tenants`, type `franchisor`). Never
  reassigned to a franchisee.
- Franchisor assigns leads to a `service_provider` (manual selection in v1).
- Service providers update status as they work the deal and manually enter
  `deal_value` themselves — there's no automatic rebate calculation from a
  formula (e.g. a percentage of loan amount). The provider's entered
  number is the source of truth.

## AI chat agent (lead capture)

- Hosted as its **own Railway service**, Python/FastAPI, **no public
  domain** — reachable only via Railway's private network
  (`*.railway.internal`) from the Next.js app's `/api/chat` route, which
  proxies to it. This keeps `OPENAI_API_KEY` off any public-facing service.
- Design: deterministic question flow per service type (not a fully
  open-ended agent), with OpenAI handling only two things per turn:
  1. Natural conversational phrasing of the next question.
  2. Extracting the user's free-text answer into a structured field via
     **tool/function calling** — never free-text parsing. If extraction is
     ambiguous, re-ask rather than guess.
- Opening turn: agent introduces itself (tenant-aware — knows which
  franchisee's site, or the franchisor's, it's running on) and asks which
  service the visitor is interested in, then branches into that service's
  question set. On the franchisor's own corporate site only, a
  corporate-only option is also offered — interest in *becoming* a
  franchisee — see "Franchise-interest leads" below.
- Question sets are fully database-backed and franchisor/super_admin-
  editable through the dashboard, not hardcoded in Python — see
  "Admin-editable chat services & questions" below. Fields can be
  conditional — a `depends_on: {field, equals}` or `{field, one_of}` on a
  field means it's only ever asked (and only ever lands in
  `leads.details`) when an earlier field's answer matches; otherwise it's
  permanently skipped, not just deferred.
- On completion of all required fields, upsert a row into `leads` (setting
  `tenant_id` per the rules above) and give a closing message.
- **Every message, in and out, is written to `chat_messages` before the
  response returns** — including abandoned sessions, for later analysis of
  drop-off points and prompt tuning. `chat_sessions` tracks status
  (`active`/`completed`/`abandoned`) and links to the resulting lead once
  qualified.

### Franchise-interest leads

People interested in *opening* a Luna Verde franchise themselves (not a
customer) are captured through the same chat agent, gated to the
franchisor's own corporate site only — a franchisee's subdomain chat is for
their local customers, never for someone wanting to open a competing
franchise. Reuses the `leads`/`chat_sessions` infrastructure wholesale
rather than a new table: one `service_types` row (key `franchise_interest`,
migration 011) with `corporate_only = true` (migration 013) and its own
question set (reason for interest, ownership experience, capital
readiness, timeline, desired operating location/territory, plus name/
email/phone/consent — no `postcode`, since its "match you with someone in
your area" wording doesn't fit a franchise-sales conversation and the
territory question already covers "where"). The gating that used to be a
hardcoded `if service_key == "franchise_interest"` check is now the
general `corporate_only` column any service can have — see "Admin-editable
chat services & questions" below.

The gating is tenant-type-aware, not a hardcoded list edit:
`web/src/app/api/chat/route.ts` forwards `tenant.type` to the agent's
`POST /chat/start`, and `agent/app/chat.py` builds the offered service list
from it (`_offered_services`/`_service_select_field`, backed by
`db.list_offered_services`) at both points that need it — the opening turn
(from the request) and the service-selection turn (re-derived via the
existing `db.get_tenant_type(session.tenant_id)`, since that's a separate
turn with no request-level tenant type). A franchisee-site visitor can't
produce `franchise_interest` as an answer at all, even by typing the raw
key — it's never in that turn's extraction enum on that tenant, not just
hidden from the intro text.

These leads are structurally invisible to `franchisee`/`service_provider`
roles under the existing RLS policies with zero policy changes (tenant_id
is always the franchisor's root tenant, never assigned to a provider), but
franchisor/super_admin's own "all leads" queries needed an explicit
`service_types.key <> 'franchise_interest'` exclusion so they don't leak
into the normal Leads table/kanban/Overview charts (`listLeads`,
`getLeadAnalytics` in `web/src/lib/db/leads.ts` — deliberately still
hardcoded to this one literal key, not generalized to `corporate_only`,
since "hide from the normal leads dashboard" is specific to this one lead
*category* being fundamentally non-customer, not a property every
corporate-only service should inherit). They get their own page instead —
`/dashboard/franchisees/prospects` ("Possible Franchisees" in the sidebar,
right after "Franchisees," plus a summary link on the Franchisees list
page itself; no true nested-submenu UI exists anywhere in this app, so
this is a flat nav item that reads as related rather than a new nav
pattern), franchisor/super_admin only. It reuses the existing generic
`/dashboard/leads/[id]` detail page unmodified for "View" (already renders
arbitrary `leads.details` + full status history with no service-specific
code) and the existing `moveLeadStatusAction` for status changes,
restricted client-side to a sales-pipeline-shaped subset that makes sense
without a provider (qualified → in_progress → won/lost/disqualified,
skipping `assigned_to_provider` and the rebate_received/rebate_paid pair)
— a UI affordance only, since `updateLeadStatus` already permits
franchisor/super_admin any status.

### Chat greeting

The chat's opening message is editable — franchisor/super_admin only, via
`/dashboard/chat-settings` ("Chat Greeting" in the sidebar). Two templates
in a singleton `chat_settings` table (migration 012, always exactly one
row, no per-franchisee override): `corporate_greeting` for the franchisor's
own site, `franchisee_greeting` used identically across every franchisee
site. `{tenant_name}` in either template is substituted with the actual
tenant's name at chat-start time (`agent/app/chat.py`'s `_build_intro`);
the "Which of these are you interested in: ..." services question is
always system-appended after it, never part of the editable text, so an
edit can't accidentally go stale against the real, tenant-type-filtered
service list (`_offered_services`).

Deliberately **not** passed through OpenAI rephrasing the way question
prompts still are (`phrase_question` in `agent/app/openai_helper.py`) —
`phrase_intro`, which used to do this for the greeting, was removed
entirely. The whole point of making the greeting editable is that what a
franchisor/super_admin types is exactly what a visitor sees, not something
an LLM might paraphrase differently turn to turn.

### Admin-editable chat services & questions

The chat agent's per-service question sets used to be static Python dicts
(`agent/app/question_sets.py`). They're now fully database-backed and
editable by franchisor/super_admin through `/dashboard/chat-services`
("Chat Services" in the sidebar) — add new services (not just edit the
original 6), add/edit/delete their questions, and configure `depends_on`
conditional branching, all without a code change or redeploy.

**Schema** (migration 013): `service_types` gains `corporate_only`
(generalizes the old hardcoded "only franchise_interest is corporate-site-
only" check into a real column any service can have) and `is_active`
(soft-deactivate only — `leads.service_type_id` FKs here, so no hard
delete). New `chat_questions` (key, prompt, `field_type`
text/email/phone/boolean/enum, `lead_field` constrained to the 5 columns
`create_lead` actually recognizes, `depends_on_key`/`depends_on_mode`/
`depends_on_values`, `position`) and `chat_question_options` (a proper
child table — `value`/`label` pairs — not jsonb, because `depends_on`
values are cross-referenced between questions and jsonb array elements
can't be individually referenced, ordered, or protected against a silent
rename). Migration 014 seeded both tables with exactly what the old Python
dicts contained, so deploying this was behavior-neutral before any admin
touched anything — verified by reproducing all 4 pre-existing conditional
branches (mortgage ×3, real_estate ×2, including the "both" case that
fires two conditional fields at once) through a real chat conversation
against the migrated data.

**Identity fields are immutable once created; everything else is
editable** — applied consistently to `service_types.key`,
`chat_questions.key`, and `chat_question_options.value`, all for the same
reason: something else references them by that exact string with no FK to
enforce it (`service_providers.service_types` stores a loose `text[]` of
service keys; `depends_on_key`/`depends_on_values` reference question keys
and option values directly), so a rename would silently orphan the
reference. Renaming means delete-and-recreate, which save-time validation
blocks if anything currently depends on it.

**Every service is auto-seeded with 4 required questions at creation**
(`full_name`/`contact_email`/`contact_phone`/`consent_to_contact` — what
`create_lead` needs to produce a usable lead) **that can't be deleted**
(blocked server-side, no delete button client-side) — structurally
prevents "a service with zero closable questions" rather than relying on
validation to catch it after the fact. `postcode` isn't auto-seeded — it's
optional, addable by the admin, since it's specific to customer-service
matching and doesn't necessarily fit every possible custom service.

**`depends_on` can only target an earlier `enum` or `boolean` question in
the same service** — matches 100% of real usage (`mortgage_purpose`,
`real_estate_intent`) and avoids "type free text that must match exactly"
as a branch condition. Validated on every create/update in
`web/src/lib/db/chat-services.ts` (the primary enforcement layer, per this
repo's convention): the target must exist, be enum/boolean, and have a
strictly earlier `position` — re-checked on every save (including a plain
reorder) so an edit can't silently break an existing dependency. Also
validated: enum questions need ≥ 1 option; deleting/renaming an option
value, deleting a question, or changing a question's type away from
enum/boolean is blocked if anything currently depends on it; flipping
`corporate_only` to `true` is blocked if any `service_providers.service_types`
currently includes that service's key (would silently orphan that
provider's "services handled" selection).

**Runtime defense-in-depth in the agent**, since admin-editable data can
still end up in a bad state between validation passes: `agent/app/main.py`'s
`/chat/start` endpoint (previously the one turn with *no* error handling
at all) now catches broadly and returns a graceful "sorry, try again
shortly" instead of an unhandled 500 for every visitor on that tenant; the
two bare `assert`s in `chat.py` that were only safe because the data used
to be static Python (a service always having questions, a service always
existing) are now real `ChatTurnError`s.

**Enum matching got more robust as a side effect.** Extraction (both real
OpenAI tool-calling and the local-dev-only deterministic fallback) used to
match only against a bare stored value (e.g. `"purchase"`); options now
carry a separate admin-authored `label` (e.g. "Just purchasing my first
home"), and both extraction paths match against label text too —
`agent/app/openai_helper.py`'s `_tool_schema_for_field` enriches the tool
description with label context (the JSON Schema `enum` constraint itself
still only accepts raw values), and `_fallback_extract`'s longest-first
substring-priority matching (there specifically to stop `"credit"` from
shadowing `"business_credit"`) now runs across both values and labels
together. This also retired the old `franchise_interest`-specific
workaround where the chat-facing label had to be kept different from the
DB's `service_types.name` purely so the old value-only fallback matcher
could substring-match it — `service_types.name` is now the single name
field, used everywhere.

### Manual lead entry (franchisee portal)

A franchisee taking a call in person — someone gives their info over the
phone instead of using the chat widget — can enter it directly at
`/dashboard/leads/new` ("Add lead" button on the Leads page), `franchisee`
role only (not franchisor/super_admin, who already have a full-platform
Leads view; this is specifically "a franchisee typing up a call they just
took"). Same services and questions as the chat agent, including
`depends_on` conditional branching — reuses the exact same
`chat_questions`/`chat_question_options` data
(`web/src/lib/db/chat-services.ts`'s `getServiceQuestions`, extracted out
so both the admin management UI and this feature read from one query
instead of drifting apart), filtered the same way the chat agent's
franchisee-site offering is (`is_active` and `not corporate_only` — a
franchisee can't submit a `franchise_interest`-style lead any more than a
caller could ask their local chat widget for one).

One page (`web/src/components/dashboard/lead-entry-form.tsx`, a client
component): a service picker at the top, then that service's questions
below with conditional fields shown/hidden entirely client-side as
earlier answers change — no per-question page turns like the chat's
turn-by-turn flow, since a form doesn't need that pacing. `web/src/lib/db/lead-entry.ts`'s
`createLeadFromEntry` re-derives which questions are actually visible
server-side from the submitted answers (mirroring the chat agent's
`next_pending_field`/`_dependency_met`) and requires every visible one be
answered, so a tampered request can't skip a question that was visible in
the real form. Writes straight into `leads`/`lead_status_history` via
`withTenantContext` — the first time the web app creates a lead directly
rather than through the agent; `tenant_id` is always the franchisee's own,
`status` starts `qualified` (matching the chat path), and the note reads
"Captured via franchisee portal (manual entry)". No `chat_sessions`/
`chat_messages` rows — those exist specifically to analyze a
*conversation's* drop-off points, and there's no conversation here, just
one form submission. No lead-created email either — the franchisee is the
one submitting it, so notifying "the franchisee" would just be notifying
themselves about their own action.

Boolean answers are handled as the literal strings `"true"`/`"false"`
throughout this form's client state, `FormData`, and server-side
`depends_on` evaluation — deliberately, since `chat_question_options`'
`depends_on_values` column already stores boolean dependency targets as
those same strings (set when an admin picks Yes/No while configuring a
question's dependency), so comparing string to string needs no coercion
here. They're only converted to a real Postgres/JSON boolean at the final
point of writing to `leads`/`leads.details`, to match the shape the chat
path already produces there.

**Found and fixed a real bug in the chat agent while building this**:
`agent/app/db.py`'s `get_questions_for_service` was putting
`depends_on_values` into a field's `depends_on` dict as the raw DB string
("true"/"false") unconditionally — but a boolean question's actual stored
answer (from `extract_answer`) is a native Python `bool`, and `True ==
"true"` is `False`, so **any `depends_on` targeting a boolean question
could never fire** since this feature shipped (migrations 013/014). No
existing question used a boolean dependency target yet — both worked
examples then were enum-based (`mortgage_purpose`, `real_estate_intent`)
— so this had shipped silently broken. Fixed by building a `key ->
field_type` lookup within the same query result and coercing
`depends_on_values` to real booleans when the target is boolean-typed,
before it's compared. Verified against a real chat conversation both ways
(bankruptcy-year follow-up correctly appears when "yes," correctly skipped
when "no") and against the new manual-entry form, then removed the test
question afterward.

## Course module

Franchisor/super_admin author training courses; franchisees self-enroll
and work through them; the franchisor sees who's enrolled and which
lessons they've actually viewed.

- A course has many lessons (`courses` → `lessons`). Each lesson is
  either `video` (a pasted YouTube/Vimeo link, parsed to an embeddable
  iframe URL by `web/src/lib/video-embed.ts`) or `text` — no PDF/image
  upload, since this project has no file storage set up and that scope
  was deliberately cut to avoid needing new infrastructure to ship.
- A course is `draft` or `published`; only published courses are visible
  to franchisees at all (`getCourseDetail`/`getLessonDetail` return
  `null` for a franchisee on a draft course, same as a 404).
- Enrollment (`course_enrollments`) and progress (`lesson_progress`) are
  both keyed to the actual login **user**, not the tenant — a franchisee
  tenant has exactly one login today, so it's equivalent in practice,
  and it matches how everything else in this app attributes activity to
  an account. "Viewed" is presence of a `lesson_progress` row, not a
  boolean, set automatically the moment a franchisee opens a lesson
  (`markLessonViewedAction`, fired from a client `useEffect` on mount —
  not tied to any explicit "mark complete" button).
- The franchisor's course detail page shows an enrollment matrix — every
  enrolled franchisee as a row, every lesson as a column, checkmarked
  when viewed — directly answering "who enrolled and which lessons have
  they gone through."
- No RLS on any of these tables, same app-layer-only pattern as
  `tenants`/`service_providers`/`users` (only `leads`/`chat_messages`/
  `rebates` are in the brief's protected set).
- `service_provider` has no access to this module at all.
- Franchisor/super_admin can also **edit** an existing course (title,
  description — `/dashboard/courses/[id]/edit`, `updateCourse`) or lesson
  (title, content type, video URL, text content —
  `/dashboard/courses/[id]/lessons/[lessonId]/edit`, `updateLesson`), not
  just create new ones — an "Edit" link sits next to the course title and
  on each lesson row, visible only to managers.
- A video lesson can now also carry optional notes, stored in the same
  `lessons.text_content` column a text lesson uses for its body (no
  schema change) — rendered under a small "Notes" heading below the
  video embed on the lesson view page, shown only when present.
- Both `text_content` fields (a text lesson's body, and a video lesson's
  optional notes) are authored through a TipTap rich text editor
  (`web/src/components/dashboard/rich-text-editor.tsx` — bold/italic,
  H1-H3 headings, bullet/numbered lists with indent/outdent (nested
  lists via `sinkListItem`/`liftListItem`), image embed by URL
  (`@tiptap/extension-image` — no file upload, since there's still no
  object storage; author pastes an already-hosted image URL and it's
  inserted as a real `<img>`), undo/redo toolbar, syncs its HTML into a
  hidden form input so it works with the existing Server Action +
  `useActionState` form pattern) rather than a plain textarea, and
  stored as HTML.
  Rendered via `dangerouslySetInnerHTML` after server-side sanitizing
  with `isomorphic-dompurify` on every read (lesson view page), not at
  write time — so sanitization rules can be tightened later without a
  backfill. TipTap always emits at least `<p></p>` for "empty" content,
  never a true empty string, so blank/required-field detection
  (`optionalHtml` in `web/src/lib/actions/courses.ts`) strips tags before
  checking length rather than doing a naive string-length check.

## Database schema

The schema is defined incrementally across migration files in
`db/migrations/`, run against the Railway Postgres instance in order
(currently up to `010_courses.sql` — see the roadmap below for what each
later one added). The first two:

1. `001_initial_schema.sql` — tenants, domains, users, service providers,
   site content, franchisee profile, service types, chat sessions/messages,
   leads, lead status history, rebate rules, rebates, plus RLS policies on
   `leads`, `chat_messages`, `rebates`.
2. `002_franchisor_lead_capture.sql` — adds `postcode` to `leads` for
   provider-area routing, and documents the franchisor-owns-outright rebate
   rule (enforced in app code, not a DB constraint, since it needs a join
   to `tenants.type`).

Document/contract file storage is **out of scope for now** — don't build
it yet, but don't design anything that would block adding it later (e.g.
Cloudflare R2 + a `documents` table linked to `leads`).

## Tech stack

- **Next.js (App Router) + TypeScript** — main web app: all tenant sites,
  the four role-based dashboards, and the `/api/chat` proxy. Scaffolded
  with Tailwind CSS and a `src/` directory.
- **Python + FastAPI** — the AI agent service.
- **Postgres** — Railway-managed, shared by both services over Railway's
  private network.
- **OpenAI API** — tool-calling for the chat agent, called only from the
  Python service.
- **Auth**: Auth.js (NextAuth) or Clerk — role claims (`super_admin` /
  `franchisor` / `franchisee` / `service_provider`) plus `tenant_id` in the
  session, used to populate the RLS `set_config` calls.

## Hosting & deployment (Railway)

- One Railway project, three services: `web` (Next.js), `agent` (FastAPI),
  `postgres` (managed addon).
- `agent` has **no public domain** — private networking only.
- `web` has both root domains attached (`franchisorbrand.com` +
  `*.franchiseenetwork.com` wildcard), plus custom domains added per
  franchisee later.
- Environment variables needed:
  - `web`: `DATABASE_URL`, `AGENT_SERVICE_URL` (internal Railway domain),
    auth secret/keys, `NEXT_PUBLIC_APP_URL`.
  - `agent`: `DATABASE_URL`, `OPENAI_API_KEY`.
- Use Railway's PR/preview environments — open a branch, get a live preview
  URL, review before merging to production. This is how we'll sanity-check
  changes rather than just reading diffs.
- Railway project/service creation itself requires an authenticated Railway
  account (browser OAuth via `railway login`), so it must be done
  interactively by the user, not by an agent running non-interactively.
  `railway.toml` files in `/web` and `/agent` document build/start commands
  so the services are easy to wire up once created.

## GitHub

- Single repo, `franchise-platform`, monorepo layout:
  ```
  /web       — Next.js app
  /agent     — FastAPI service
  /db/migrations — SQL migration files, run in order
  ```
- Standard feature-branch workflow: branch → PR → Railway preview deploy →
  review → merge to `main` → Railway auto-deploys `main` to production.
- Don't commit secrets. All API keys and connection strings come from
  Railway environment variables, referenced via `.env` locally
  (`.env` gitignored, `.env.example` committed with empty values).

## Conventions to follow throughout

- Never write a query that skips the tenant/role scoping layer, even for
  "just this once" admin scripts.
- Franchisee-editable fields are whitelisted at the API layer, not just
  hidden in the UI.
- Chat agent answer extraction always goes through a tool-call schema.
- Every chat message is persisted before the turn completes.
- No automatic rebate calculation — `deal_value` is whatever the service
  provider enters, not a computed percentage/cap of anything.

## Roadmap

1. ✅ Scaffold the repo structure above, initialize Next.js and FastAPI apps.
   GitHub repo (`bmtanushka/franchise-platform`) and Railway project
   (`franchise-platform`, 3 services: `web`, `agent`, `Postgres`) are both
   live — `web` and `agent` auto-deploy on push to `main`.
2. ✅ Run the two migration files against Railway Postgres. All 14 tables
   created, RLS policies applied, franchisor root tenant + 5 service types
   seeded.
3. ✅ Tenant-resolution proxy (`web/src/proxy.ts` — Next.js 16 renamed
   `middleware.ts` to `proxy.ts`) resolves hostname → tenant via the
   `domains` table and injects tenant context via headers. Franchisor root
   site and a test franchisee (`va1`) both render from the same
   `StandardTemplate` component with different content/contact details.
   Real subdomain routing (`*.franchiseenetwork.com`) needs an actual
   domain — until then, `va1` is only reachable at `va1.localhost:3000`
   in local dev (Railway auto-domains can't have sub-subdomains added).
4. ✅ NextAuth (Credentials) login wired with role/tenant_id in the JWT;
   `withTenantContext` in `web/src/lib/db/context.ts` is the shared
   `set_config` wrapper. One shared `/dashboard` page renders differently
   per role (four roles all tested end-to-end, seeded via
   `web/scripts/seed.mjs`).
5. ✅ FastAPI agent (`/agent`) does the full conversation → tool-call
   extraction → lead written → chat history logged loop, data-driven
   for all 5 services at once (`agent/app/question_sets.py`) rather than
   one-then-extend. Tested end-to-end on production including a full
   mortgage and a full credit conversation through to a created lead.
6. ✅ Lead status pipeline UI, added to the shared `/dashboard` page
   (`web/src/app/dashboard/leads-section.tsx`): franchisor/super_admin see
   all leads and can assign an unassigned one to a provider (Server
   Action, `web/src/lib/actions/leads.ts`); providers see only their
   assigned leads and can move status to `in_progress`/`won`/`lost`/
   `disqualified` with an optional deal value; franchisees get read-only
   visibility into their own tenant's leads. `leads_provider_update` RLS
   policy added (migration 005) — the original schema only gave providers
   SELECT. Every change still logs to `lead_status_history` with
   `changed_by`. Tested end-to-end with a real browser (franchisor assign
   → provider update to `won` with deal value → franchisee sees the
   result read-only). The status/deal-value form defaults to the lead's
   *current* status (not always the first option) and pre-fills the
   existing deal value, so re-submitting to tweak one doesn't silently
   clobber the other.
7. ❌ Descoped — no automatic rebate calculation. Originally planned as
   "insert a `rebates` row using `rebate_rules` (percentage of deal
   value, capped) on status → `won`," but decided against computing it
   at all: the service provider's manually-entered `deal_value` (step 6)
   is the only number tracked. The `rebates`/`rebate_rules` tables still
   exist in the schema (migration 001) but nothing writes to them.

   What *was* added instead (still manual, no math): two more
   `lead_status` enum values, `rebate_received` and `rebate_paid`
   (migration 006 — `ALTER TYPE ... ADD VALUE`, can't run in the same
   transaction as a statement using the new value). Franchisor/
   super_admin only can advance a `won` lead through them
   (`REBATE_STATUSES` guard in `web/src/lib/db/leads.ts` — providers and
   franchisees are blocked), via a one-click "Mark rebate received/paid"
   button next to the lead row on `/dashboard`.

   Also added: a lead detail page (`/dashboard/leads/[id]`) with a "View"
   link from every row, for all four roles. Shows the full
   `leads.details` jsonb (whatever the chat agent collected —
   service-specific answers), contact info, and the complete
   `lead_status_history` timeline with who changed what and when. Same
   role-scoping as the list view (a provider/franchisee opening a lead
   they're not authorized for gets a 404, verified with real browser
   sessions for both).
8. ✅ Dashboard redesign: proper shell (top bar + role-filtered left
   sidebar, `web/src/app/dashboard/layout.tsx` +
   `web/src/lib/dashboard-nav.ts`) with content split into real routes
   instead of one page branching by role — `/dashboard` is now an
   analytics Overview (stat tiles + status/service-type/30-day-trend
   charts from `getLeadAnalytics()`, colors per the `dataviz` skill's
   ordinal-ramp-for-pipeline-stages approach), plus dedicated
   `/dashboard/leads`, `/dashboard/franchisees`, `/dashboard/providers`,
   `/dashboard/profile` pages.
9. ✅ Franchisor/super_admin can create franchisee and service-provider
   accounts directly from the dashboard ("Add franchisee" / "Add
   provider" on their respective list pages →
   `web/src/app/dashboard/franchisees/new`, `.../providers/new`).
   `web/src/lib/db/accounts.ts` creates the tenant + `franchisee_profile`
   + login `users` row (or `users` + `service_providers` row) in one
   transaction; the Server Actions
   (`web/src/lib/actions/accounts.ts`) use `useActionState` so a
   duplicate subdomain/email surfaces as an inline form error
   ("That subdomain is already taken") instead of a crash, caught via the
   `tenants_slug_key` / `users_email_key` Postgres unique-violation codes.
   New franchisees get the default "standard" `site_templates` row
   automatically. The admin sets the new account's login password
   directly in the form (shared with the owner out of band) — no
   email-invite flow. Verified end-to-end: created accounts can log in
   immediately with the entered contact details showing correctly, and
   franchisee/provider roles are blocked from the `/new` pages.
10. ✅ Second, real franchisee site template (`web/src/franchisee-site/`,
    copied from `Web-pages/Franchisee/`) — same raw-HTML mechanism as the
    corporate site (`web/src/lib/franchisee-site.ts` +
    `src/app/franchisee-site/[[...slug]]/route.ts`, rewritten to from
    `proxy.ts` when `tenant.type === "franchisee"` and their
    `template_id` points at the new `site_templates` row
    (`component_key = 'luna-verde-franchisee'`, migration 007) rather
    than `standard`). Unlike the corporate site, this template is shared
    across every franchisee that picks it, so the placeholder brand name
    ("Luna Verde 5", including the styled `<em>` logo variant) and the
    franchisee_profile contact fields are substituted into the
    header/footer/page HTML at render time instead of being fixed
    content — see `renderFranchiseeSitePage()`. Needed its own copy of
    the corporate site's `chat-widget.js` `<script>` tag in the footer
    partial (same reason: raw HTML bypasses React, so the React
    `ChatWidget` never mounts) and a `white-space:nowrap` fix on `.logo`
    since real tenant names run longer than the "Luna Verde 5" placeholder.

    Template selection: `site_templates` now has two rows (`standard`,
    `luna-verde-franchisee`); which one a tenant uses is just
    `tenants.template_id`, changeable via either edit flow below —
    already-extensible per the brief's original design, no new schema.

    Two edit flows, deliberately different scopes:
    - **Franchisee self-service** (`/dashboard/profile/edit`,
      `web/src/lib/actions/profile.ts`): template picker + the brief's
      whitelisted contact fields only (phone/email/address/hours/blurb,
      via the pre-existing `updateFranchiseeProfile`). Cannot rename the
      business or change its subdomain.
    - **Franchisor/super_admin** (`/dashboard/franchisees/[id]/edit`,
      `updateFranchiseeAdmin` in `web/src/lib/db/accounts.ts`): everything
      the self-service form has, plus name/slug/status — an "Edit" link
      per franchisee row on `/dashboard/franchisees`.

    Verified end-to-end: admin changes a franchisee's template + contact
    info → site immediately reflects it (brand name, phone, address,
    blurb all substituted correctly); franchisee's own edit hits the same
    underlying data; switching back to "Standard" correctly reverts to
    the React `StandardTemplate` (proxy's dual-path rewrite logic tested
    both directions, not just one).

11. ✅ Leads table filtering/sorting/date column
    (`web/src/components/dashboard/leads-table.tsx`, a client component —
    the old `leads-section.tsx` is now a thin Server Component that just
    fetches data and delegates rendering). Search box (name/email
    substring), status filter, service-type filter, all combinable, plus
    a live "N of M" count and a "Clear filters" link. Every column header
    is clickable to sort (ascending/descending toggle, arrow indicator);
    the clickable area fills the full header cell, not just the label
    text — an initial version only wired the click handler to the
    inline-sized text, so most of the header was dead space. Added a
    "Captured" column showing the lead's `created_at` date (full
    timestamp on hover). Same role-scoped `leads` data as before, no
    schema or query changes. Verified end-to-end on production:
    full-cell header clicks correctly toggle sort order, and status/
    service filters return exactly the matching rows (confirmed against
    real data, not just no-crash).

12. ✅ Kanban board view for leads, alongside the table
    (`web/src/components/dashboard/leads-kanban.tsx`), with a Table/Kanban
    toggle (`leads-view-switcher.tsx`) on `/dashboard/leads`. One column
    per `lead_status`, color-accented to match `StatusBadge`'s tone;
    cards are draggable between columns. Dragging calls the same
    `updateLeadStatus`/`assignLeadToProvider` functions the table's forms
    use, through new non-redirecting server actions
    (`moveLeadStatusAction`, `assignLeadInlineAction` in
    `web/src/lib/actions/leads.ts` — plain function calls from a client
    component rather than `<form action>` submissions, so they return
    `{error}` and don't `redirect()`). Which columns a card can be
    dropped on is gated per role to match exactly what the table already
    exposes — not the wider set `updateLeadStatus`'s guards would
    technically allow — so the two views never let you do something in
    one that's unavailable in the other: providers can drop into
    in_progress/won/lost/disqualified; franchisor/super_admin only get
    the won→rebate_received→rebate_paid chain (one step at a time, same
    as the table's rebate-advance button); franchisees are fully
    read-only (no draggable cards, no assign dropdowns). Unassigned cards
    get an inline "Assign to..." picker instead of a drag target, since
    assignment needs a provider chosen, not just a status. Dropping onto
    "Won" prompts for a deal value. The shared status-transition rules
    (`PROVIDER_NEXT_STATUSES`, `NEXT_REBATE_STATUS`) were pulled out to
    `web/src/lib/lead-status-rules.ts` so table and kanban can't drift
    apart. Verified end-to-end on production per role: franchisor sees
    all 9 columns with inline assign; provider drag from In progress to
    Won with the deal-value prompt persisted correctly after a full page
    reload; an invalid drop (provider dragging an Assigned card into
    Qualified) was correctly rejected client-side; franchisee kanban view
    has zero draggable cards and zero assign controls.

13. ✅ Self-service password management: change-password on
    `/dashboard/profile` for every role (`ChangePasswordForm`,
    `web/src/lib/actions/auth.ts`'s `changePasswordAction` — verifies the
    current password via bcrypt before updating), plus a full
    forgot-password email flow (`/forgot-password` requests a link,
    `/reset-password?token=...` sets a new one). Required giving
    super_admin/franchisor a `/dashboard/profile` page too — they'd never
    had one, since "My Profile" was previously franchisee/service_provider
    only in `dashboard-nav.ts`; now `ALL_ROLES`. Reset tokens
    (`password_reset_tokens`, migration 008) store only a sha256 hash of
    the raw token (mirrors how `password_hash` itself is stored), expire
    after 1 hour, and are atomically consumed via `UPDATE ... RETURNING`
    so a reused or double-clicked link can't work twice — verified by
    replaying the same link and confirming the second attempt is
    rejected. `requestPasswordResetAction` always returns the same
    generic message whether or not the email is registered, so the
    endpoint can't be used to enumerate accounts (verified: an existing
    and a nonexistent email produce identical responses). Emails send via
    Resend (`web/src/lib/email.ts`, needs `RESEND_API_KEY`); when unset,
    the reset link is logged server-side instead of failing — same
    fallback pattern as the chat agent's `OPENAI_API_KEY` — which is the
    current state on Railway (`RESEND_API_KEY` not yet set there, see
    "Known gaps" below). Verified end-to-end both locally and on
    production: change-password's wrong-current-password and
    passwords-don't-match error states, a full reset via a token pulled
    from the server log (local) / Railway logs (prod), the single-use
    rejection, and signing in with the new password afterward — all test
    account passwords reverted back to `Passw0rd!` afterward.

14. ✅ Three email notifications, all through the Resend integration (or,
    for the agent service, a small equivalent using a plain HTTPS call
    rather than the SDK — see below):
    - **Lead assigned → provider.** Hooked directly into
      `assignLeadToProvider` (`web/src/lib/db/leads.ts`), so it fires for
      both the table's assign form and the kanban's inline assign
      dropdown without needing a separate hook per caller.
    - **Lead created → franchisee.** Franchisor-site leads are owned by
      the franchisor outright and never routed to a franchisee, so this
      only fires when the created lead's tenant is actually a franchisee
      — hooked into the agent service's `_finalize_lead`
      (`agent/app/chat.py`), right after `db.create_lead`. This is the
      one notification that lives in the Python agent, not the Next.js
      app, because that's where leads actually get created — the agent
      writes directly to Postgres and was never routed through the web
      app's Server Actions.
    - **Daily digest → every login account, 6am ET.** Reuses
      `getLeadAnalytics` per recipient (`web/src/lib/jobs/daily-summary.ts`)
      so each person's counts are scoped exactly the way their dashboard
      already scopes them — a franchisee never sees another tenant's
      numbers here either, same two-layer rule as everywhere else. Runs
      as an in-process `node-cron` job registered once from
      `web/src/instrumentation.ts` rather than a separate Railway cron
      service, since `web` already runs as one long-lived process; the
      job fires hourly and checks the real America/New_York clock itself
      rather than a fixed UTC hour, so 6am stays correct across the DST
      change without a config update twice a year. Assumes a single
      `web` replica — if this service is ever scaled out, every replica
      would fire its own 6am job and recipients would get duplicates.

    Both the assignment and lead-created emails are best-effort: wrapped
    in try/except (Python) or try/catch (TS) so a failed or unconfigured
    send can never break the assignment or the chat agent's lead capture
    itself — same principle as everywhere else `RESEND_API_KEY` is
    optional. The agent needs its own `RESEND_API_KEY` now too (same
    Resend account/key as `web`, see "Known gaps").

    Verified end-to-end locally: drove a full chat conversation on a
    franchisee subdomain (`va1.localhost`) through to a created lead and
    confirmed the franchisee-notification log line; assigned that lead to
    a provider via the dashboard and confirmed the provider-notification
    log line; temporarily wired a manual-trigger route to run the daily
    job on demand (removed after) and confirmed every recipient's count
    matched their actual scoped data — franchisor/super_admin saw the
    platform-wide total, the franchisee saw only their tenant's leads,
    each provider saw only their own assigned count. Re-verified the chat
    → lead-creation path and the assignment path on production too
    (`web-production-80ea6d.up.railway.app`); the franchisee-notification
    path itself could only be re-verified locally, since production has
    no reachable franchisee subdomain to drive a chat session on (see the
    existing `va1.web-production-80ea6d...` gap in "Known gaps") — the
    code path is identical either way, only the trigger differs.

15. ✅ Dashboard visual polish — fixed a real layout bug (every page
    wrapped its content in `mx-auto w-full max-w-{2xl|3xl|5xl}`, which
    centers a narrow column inside the wide `<main>` next to the
    sidebar, leaving a large dead gap on the left on any real monitor)
    and brought the whole shell up to a more modern, consistent look
    using the existing Forest/Moss/Gold style kit — no new palette.
    Shared `pageContainerClass` (`web/src/lib/dashboard-ui.ts`, no
    `mx-auto`) replaces the ad-hoc wrapper on every page. New
    `PageHeader` (icon in a tinted circle + title/description + action)
    and `EntityRow` (avatar-circle initials, name/meta, status pill)
    components (`web/src/components/dashboard/`) replace the bare `<h1>`
    and plain bordered list rows Franchisees/Providers had had since
    early in the build; both pages also gained a small stat-tile summary
    row so they read as part of the same dashboard as Overview.
    `TenantStatusBadge` sits alongside the existing lead `StatusBadge`,
    both now built on a shared `TonePill`/`TONE_CLASSES` instead of
    duplicating the tone-to-class mapping. `TopBar` gained a logo mark
    and a user initials-avatar. Verified per role (super_admin/
    franchisor, franchisee, service_provider) at a realistic wide
    viewport, both locally and on production — the alignment bug only
    shows up at real monitor widths, not a narrow one.

    Hit a real deployment snag along the way: the `web` service's
    Railway build failed twice in a row on an unrelated, pre-existing
    step (`next/font/google` / Turbopack's internal font module,
    `Module not found: @vercel/turbopack-next/internal/font/google/font`)
    that had nothing to do with this change — turned out to be a stale/
    corrupted Nixpacks Docker layer cache, not a real regression. Fixed
    by setting `NIXPACKS_NO_CACHE=1` on `web` for one deploy to force a
    clean build, confirming success, then removing the variable again
    (kept off by default — it would slow down every future build if left
    on). Worth remembering if a Railway build ever fails on something
    that clearly hasn't changed: try a cache-busted rebuild before
    assuming the code is at fault.

16. ✅ Conditional (branching) questions in the chat agent's question
    sets — a field can now declare `depends_on: {field, equals}` or
    `{field, one_of}` (`agent/app/question_sets.py`) so it's only ever
    asked when an earlier answer matches; unmet fields are permanently
    skipped, not deferred, and never appear in the resulting lead's
    `details`. Question traversal in `agent/app/chat.py` goes through one
    `next_pending_field()` helper instead of indexing sequentially into
    the list, so this is the single place the skip logic lives.

    Applied to two of the five services as worked examples — `mortgage`
    (`mortgage_purpose`: `purchase` → pre-approval status, `refinance` →
    current lender, `home_equity` → what the funds are for) and
    `real_estate` (`real_estate_intent`: `buying`/`both` → financing
    status, `selling`/`both` → whether there's a mortgage on the
    property being sold — picking `both` correctly triggers *both*
    follow-ups, not just one). `credit`, `foreign_national_credit`, and
    `business_credit` are unchanged for now — no branches invented for
    them since that's real qualification-flow business logic, not
    something to guess; extending the same pattern there is
    straightforward once specific branches are wanted.

    Verified against the running agent directly across four scenarios
    (refinance, purchase, buying+selling "both", selling-only) — each
    time confirming both that the right follow-up fires and that skipped
    fields never land in `leads.details` — then re-verified end-to-end
    on production (`mortgage` → `home_equity`) via a real conversation
    through the actual `/api/chat` proxy, checking the resulting lead's
    `details` in the database.

17. ✅ Franchisor/super_admin can now edit service providers — there was
    previously no edit path at all, only create. New
    `/dashboard/providers/[id]/edit` (`EditProviderForm`) lets them
    change company name and services handled; login email/password are
    deliberately excluded, same reasoning as `updateFranchiseeAdmin` not
    touching the franchisee owner's login identity — that's a separate
    concern from the business-facing profile.

    Also added service areas — which US states/cities a provider
    actually covers — to both the create and edit forms. Stored as
    `service_providers.service_areas` (migration 009, jsonb array of
    `{state, stateName, cities[]}`; nothing queries it relationally yet,
    e.g. no area-based lead routing, so a normalized table wasn't
    worth it over one jsonb column). Real state/city data comes from the
    `country-state-city` npm package rather than a hand-curated list —
    city data varies too much in what "the list" should include to
    generate reliably from memory. Cities are fetched per-state on
    demand via a Server Action (`getCitiesForStateAction`) rather than
    shipping the whole package's data (every country) to the browser.
    `ServiceAreaPicker` (`web/src/components/dashboard/`) is the one
    shared component both forms use: pick a state, search/check its
    cities, add as a removable area chip; a provider can cover multiple
    states.

    Hit a real data bug wiring this up: `${JSON.stringify(areas)}` as a
    plain template parameter into a jsonb column double-encoded it —
    postgres.js auto-serializes JS values for jsonb columns, so handing
    it an already-stringified string just got serialized *again* into a
    JSON string scalar (`jsonb_typeof` was `"string"`, not `"array"`).
    Fixed with postgres.js's `sql.json()` helper, the documented way to
    pass an already-typed value for a `json`/`jsonb` column.

    Verified end-to-end both locally and on production: created a
    provider with a real service area (Virginia → Alexandria/Arlington
    locally, Maryland → Bethesda on prod), confirmed
    `jsonb_typeof(service_areas)` is genuinely `array` not `string` in
    both places, and edited the local one to add a second state
    (California), confirming both areas persist together correctly.

18. ✅ User management for super_admin — new `/dashboard/users`
    (nav item gated `["super_admin"]` only in `dashboard-nav.ts`, and
    re-checked server-side on both pages) lists every super_admin/
    franchisor login and lets the super_admin create more of either.
    Franchisees and providers aren't listed here — they already have
    their own pages tied to a tenant/profile row; this only covers the
    two roles that had no management surface before (originally only
    seedable via `web/scripts/seed.mjs`).

    `createAdminUser` (`web/src/lib/db/accounts.ts`) is deliberately
    stricter than `ACCOUNT_CREATOR_ROLES`/`assertCanCreateAccounts`
    (which lets franchisor create franchisees/providers too) — only
    `actingRole === 'super_admin'` can call it, so a franchisor account
    can never create a peer or escalate itself to super_admin. A new
    franchisor account's `tenant_id` is set to the singleton franchisor
    tenant (looked up by `type = 'franchisor'`), matching how the
    originally seeded franchisor account is wired, so every franchisor
    user shares the same platform-wide view.

    Verified end-to-end both locally and on production: created a new
    franchisor and a new super_admin account, confirmed `tenant_id`/
    `role` landed correctly in the DB in both places, confirmed the new
    franchisor gets identical dashboard access (franchisee list, leads)
    to the originally seeded one, and confirmed franchisor/franchisee/
    service_provider logins neither see the "Users" nav item nor can
    reach `/dashboard/users` directly (redirected to `/dashboard`).

19. ✅ Edit for admin/franchisor user accounts — `/dashboard/users/[id]/edit`
    (`EditAdminUserForm`) lets a super_admin change a user's full name and
    role. Login email isn't editable, same reasoning as franchisee/
    provider edit not touching login identity.

    Two lockout guards on `updateAdminUser`, since super_admin is the
    only role that can reach this page at all: can't change your own
    role (the form disables the role `<select>` when editing yourself,
    backed by a hidden input so the current role still submits, plus the
    same check server-side), and can't demote the last remaining
    super_admin (in practice already covered by the self-guard — if only
    one super_admin exists, whoever's editing must be that one — but
    kept as defense-in-depth, same two-layer pattern as everywhere else).
    Changing a user's role re-resolves `tenant_id` the same way
    `createAdminUser` does (franchisor → the singleton franchisor
    tenant, super_admin → null).

    Verified end-to-end both locally and on production: edited another
    user's name and promoted them franchisor → super_admin, confirmed
    `tenant_id` cleared correctly; opened the self-edit page and
    confirmed the role select is disabled with an explanatory note,
    submitted a name-only change, and confirmed the role stayed
    untouched in the DB.

20. ✅ Course module — franchisor/super_admin author courses made of
    lessons, franchisees self-enroll and work through them, franchisor
    sees who's enrolled and which lessons they've viewed. See the
    "Course module" section above for the architecture; migration 010
    (`courses`, `lessons`, `course_enrollments`, `lesson_progress`).

    Scoped down from the original ask in conversation: lessons are
    video (YouTube/Vimeo link) or text only, no PDF/image upload — this
    project has no file/object storage set up at all, and standing one
    up needs a new external account/credentials from the user (same
    situation as `RESEND_API_KEY`), so link-based video was the way to
    ship this in one pass without a hard external blocker.

    New `/dashboard/courses` (role-branching like `/dashboard/profile`:
    franchisor/admin get a management list + "Add course"; franchisee
    gets a browse-and-enroll list), `/dashboard/courses/[id]` (lesson
    list + either the enrollment matrix or an Enroll button depending on
    role), lesson create/view pages. `video-embed.ts` parses a pasted
    URL into an iframe src (common YouTube/Vimeo shapes, not
    exhaustive), falling back to a plain "Watch video" link for
    anything unrecognized instead of a broken embed.

    Caught and fixed a real access-control gap while testing: the
    courses list and lesson-view pages relied only on the DB layer
    throwing for `service_provider` (an unauthorized role), which
    surfaced as a raw Next.js 500 error page instead of the clean
    `redirect("/dashboard")` every other dashboard page gives an
    unauthorized role — added the same explicit guard used everywhere
    else. Worth remembering for any future page: the DB-layer role check
    is the enforcement layer, but the page itself still needs its own
    guard *before* calling it, for a clean redirect instead of a 500.

    Verified end-to-end both locally and on production: created a
    course with a video and a text lesson, confirmed it was hidden from
    a franchisee while `draft`, published it, enrolled as a franchisee,
    opened both lessons (confirmed the YouTube embed actually renders,
    not just that the URL parsed), and confirmed the franchisor's
    enrollment matrix showed that franchisee with both lessons checked
    off — production run showed a second, independently-enrolled
    franchisee too, confirming the matrix handles multiple enrollments
    correctly. Re-verified `service_provider` gets a clean redirect (not
    a 500) from every course-module route.

21. ✅ Course/lesson editing, video-lesson notes, and a rich text editor
    for lesson content — see the "Course module" section above for the
    details (`updateCourse`/`updateLesson`, the `RichTextEditor` TipTap
    component, `isomorphic-dompurify` sanitization on render). No schema
    change — video notes reuse the existing `lessons.text_content`
    column. Verified locally against the tunneled Railway Postgres (not
    a throwaway local DB, so two pre-existing demo rows — "Onboarding
    101" and its "Company policies"/"Welcome video" lessons — were
    edited during testing and restored afterward, though the restored
    course description and lesson text are a best-effort reconstruction
    rather than byte-for-byte originals, since the exact prior values
    weren't captured before editing): franchisor edited a course's
    title/description, edited a text lesson's rich content and confirmed
    a `<script>` tag survives to storage but is stripped on render while
    real formatting (bold, lists) renders correctly, added notes to a
    video lesson and confirmed they render under a "Notes" heading below
    the embed, and confirmed franchisees see the rendered rich content
    but get no Edit links/pages and service_provider is still fully
    blocked from the module.

22. ✅ Franchise-interest leads — the corporate-site chat agent now offers a
    6th option, interest in becoming a franchisee, alongside the 5 customer
    services. See "Franchise-interest leads" under "AI chat agent" above for
    the full design (reuses `leads`/`service_types` rather than a new
    table, migration 011, tenant-type-gated to the franchisor's own site,
    dedicated question set and closing fields, own dashboard section at
    `/dashboard/franchisees/prospects`).

    Verified end-to-end locally: drove a full chat conversation on the
    franchisor tenant (`localhost:3000`) through "Franchise interest" to a
    created lead, confirmed all 5 franchise-specific answers (interest
    reason, ownership experience, capital readiness, timeline, desired
    operating location) landed correctly in `leads.details` and contact
    fields landed in their columns; confirmed the same conversation on a
    franchisee subdomain (`va1.localhost:3000`) never offers the option on
    either the intro or a retry message, and typing the raw key
    `franchise_interest` directly is still rejected (it's never in that
    turn's extraction enum on that tenant); confirmed the resulting lead
    shows on `/dashboard/franchisees/prospects` but is absent from
    `/dashboard/leads` (table and kanban) and from Overview's total/
    service-type charts; confirmed franchisee/service_provider roles are
    redirected away from the new page and see no nav item for it; confirmed
    the New/Edit Service Provider forms' "services handled" list still
    shows only the original 5 services; confirmed the existing generic
    `/dashboard/leads/[id]` page renders the franchise-specific fields
    correctly with zero page-level changes.

    Hit one real bug during verification, specific to local dev without
    `OPENAI_API_KEY` set: the deterministic fallback extractor matches an
    enum answer by substring against its label text, and "Franchise
    Opportunity" doesn't textually contain the key `franchise_interest` the
    way every other service's label already contains its key (e.g.
    "Mortgage" contains "mortgage"). Fixed by changing the chat-facing
    label to "Franchise interest" instead — the DB's more formal
    `service_types.name` ("Franchise Opportunity," shown on the lead detail
    page) is a separate value, unaffected. Production is unaffected either
    way since `OPENAI_API_KEY` is set there and real tool-calling
    understands the intended phrasing regardless of exact wording — worth
    remembering for any future new enum option added to the chat: keep its
    label containing its key, or the local-dev-only fallback breaks for it
    specifically.

23. ✅ Removed every embedded contact form from both raw-HTML site
    templates — chat is now the only way to contact/collect data on either
    site, matching the AI chat agent's role in the brief. This was two
    different things, not one: `partner-with-us.html` (both site types) had
    a dead decorative form (`action="#"`, never wired to a backend) for
    business-partner inquiries (realtors, lenders, title companies — a
    different category from both customer leads and franchise-interest
    leads, out of scope to build a real capture flow for); the corporate
    site's `index.html` had two *real, functioning* third-party form
    embeds — GoHighLevel/ShareTechSolutions iframes (`link.sharetechsolutions.com`)
    for "Claim Your Rebate Offer" and "Commercial Mortgage Financing" —
    that silently bypassed this app's `leads` table and the chat agent
    entirely; the franchisee site's `index.html` had the same "Claim Your
    Rebate" embed. All three replaced with a "Chat With Us" button
    (`onclick="document.getElementById('cw-toggle').click()"`, opening
    `chat-widget.js`'s existing floating panel — no new JS needed) inside a
    matching prompt card, and the now-fully-unused
    `<script src="https://link.sharetechsolutions.com/js/form_embed.js">`
    tag and every form-specific CSS rule (`.form-grid`, `.form-input`,
    `.apply-form-wrap`, etc.) removed too. Individual service detail pages
    (`commercial-mortgages.html` on both site types, etc.) already only
    ever had a static "chat with our agent" prompt, never an embedded
    form — confirmed via a full-repo grep for `<form`, `sharetechsolutions`,
    and `widget/form` across every page on both site types before and
    after, landing at zero remaining matches.

24. ✅ Follow-up to the above: every "Chat With Us" link/button across both
    site types now actually opens the chat widget, not just the ones behind
    the removed forms. Two distinct gaps, found via a full-repo grep for
    "Chat With Us"/"Contact Us" across every page:
    - The corporate site's shared nav dropdown (`_partials/header.html`,
      injected on every page) had 4 "Chat With Us" entries linking to
      `/<page>#apply` — cross-page navigation-then-scroll instead of
      actually opening the widget. Same for 7 hero/mid-page "Chat With Us"
      CTA buttons on `credit.html`/`foreign-nationals.html`/
      `real-estate.html`/`commercial-mortgages.html`/`business.html`
      linking to their own page's `#apply`/`#commercial-apply` anchor. All
      converted to `href="#"` (or `type="button"`) +
      `onclick="document.getElementById('cw-toggle').click()"`
      (`return false` on the `<a>` versions to block the anchor jump),
      opening `chat-widget.js`'s existing panel directly instead.
    - Those same `#apply`/`#commercial-apply` sections' static "💬 Chat with
      our agent..." message cards had **no actual button at all** on 5
      corporate-site pages and 2 franchisee-site pages
      (`commercial-mortgages.html`, `business.html`) — a visitor who
      scrolled there (e.g. via a "Get Started" CTA using different wording,
      deliberately left untouched since it isn't literally "Chat With
      Us"/"Contact Us") had nothing to click. Added a matching "Chat With
      Us" button to each.

    Left untouched, deliberately: two "Contact us for state-specific
    information" instances in `about-us.html` (plain disclaimer prose, not
    a link/button — nothing to wire); CTA buttons labeled differently
    ("Get Started," "Start Your Application," "Become a Partner," etc.) —
    out of scope for a request specifically about "Chat With Us"/"Contact
    Us" text, and every one of them already lands on a section that now has
    a working chat button regardless.

    Verified locally: full-repo grep confirms every remaining "Chat With
    Us"/"Contact Us" occurrence on both site types is either an
    onclick-wired element or the two prose exceptions above. Hit a real
    gotcha mid-verification: `web/src/lib/corporate-site.ts` caches file
    contents in an in-memory `Map` (`fileCache`) read once per dev-server
    process, so these raw-HTML edits didn't show up in fetched pages until
    the dev server was restarted — worth remembering for any future
    corporate/franchisee-site HTML edit, since `next dev`'s Fast Refresh
    doesn't cover this cache the way it does the React module graph.

25. ✅ Editable chat greeting — see "Chat greeting" under "AI chat agent"
    above for the design (migration 012's singleton `chat_settings` table,
    separate corporate/franchisee templates, `{tenant_name}` substitution,
    system-appended services question, franchisor/super_admin-only via
    `/dashboard/chat-settings`). Scope was confirmed with the user before
    building — asked whether this should be one shared greeting everywhere
    or a separate one for the corporate site vs. a franchisee default; they
    chose the latter, which is what's built.

    Removed `phrase_intro` from `agent/app/openai_helper.py` entirely
    (dead code once the greeting stopped going through OpenAI rephrasing)
    rather than leaving it unused.

    Verified end-to-end locally: confirmed the default greeting (seeded
    byte-identical to the old hardcoded fallback text) still opens correctly
    on both a franchisor tenant and a franchisee tenant, with the right
    tenant name substituted and the right service list per tenant type
    (franchise-interest included only on the franchisor site, per the
    existing gating); edited both templates via the dashboard form and
    confirmed a fresh chat session on each tenant type immediately reflected
    the new text verbatim (not paraphrased) with correct substitution;
    confirmed franchisee/service_provider roles are redirected away from
    `/dashboard/chat-settings` and don't see the nav item; reverted the
    test greeting text back to the original default afterward, since this
    is live production data, not a throwaway local DB.

26. ✅ Admin-editable chat services & questions — replaced the hardcoded
    Python question sets with a fully database-backed, franchisor/
    super_admin-editable model. See "Admin-editable chat services &
    questions" under "AI chat agent" above for the full design (migrations
    013/014, the `chat_questions`/`chat_question_options` schema, the
    identity-fields-immutable rule, the auto-seeded required questions,
    the `depends_on` validation rules, the agent's new defense-in-depth
    error handling, and the label-aware extraction matching). Went through
    a full design-validation pass before implementation, given this
    replaces a live, revenue-relevant lead-capture flow used by every
    tenant — that pass caught two real risks the initial design missed
    (bare `assert`s that were only safe as static Python, and jsonb being
    the wrong model for cross-referenced enum options) that reshaped the
    plan before any code was written.

    Verified end-to-end locally: regression-tested all 6 pre-migration
    services through real chat conversations, specifically exercising all
    4 existing conditional branches (mortgage ×3, real_estate ×2 —
    including the "both" case firing two conditional fields at once) to
    confirm the migrated data reproduces the exact prior behavior;
    confirmed `franchise_interest` still only appears on the franchisor
    tenant via the new `corporate_only` column; created a brand-new custom
    service ("Equipment Leasing") entirely through the dashboard, confirmed
    its 4 required questions were auto-seeded and undeletable, added an
    enum question with options and a second question that `depends_on` it,
    and drove a real chat conversation through it to a created lead with
    the conditional field firing correctly and landing in `leads.details`
    — confirmed the new service appeared in the live offered list
    immediately, no restart needed; confirmed the `corporate_only`-flip
    validation correctly blocks marking an in-use service corporate-only
    (tested against a real provider that had `mortgage` selected); tested
    unit-level that the reworked fallback extractor matches option labels
    (not just values) while preserving the pre-existing longest-first
    substring-priority rule that stops `"credit"` from shadowing
    `"business_credit"`; confirmed franchisee/service_provider roles are
    redirected away from `/dashboard/chat-services` and don't see the nav
    item; confirmed the New Provider form's "services handled" list
    correctly includes new non-corporate-only services and excludes
    corporate-only ones. Test service and its test lead deleted afterward
    (leads FK to service_types, so the lead had to go first) — this is
    live production data via the SSH-tunneled local dev DB, not a
    throwaway one.

27. ✅ Manual lead entry from the franchisee portal — see "Manual lead
    entry (franchisee portal)" under "AI chat agent" above for the full
    design (`/dashboard/leads/new`, franchisee-only, same services/
    questions/`depends_on` as the chat agent, writes directly to `leads`
    for the first time from the web app rather than through the agent).

    Found and fixed a real bug in the chat agent while building this — see
    the same section above — `depends_on` targeting a boolean question
    could never fire, since the stored answer is a real Python bool but
    the comparison was against the raw DB string. Shipped silently broken
    with the previous roadmap item, since neither worked example used a
    boolean dependency target.

    Verified end-to-end locally and on production concepts (schema/logic
    identical, only exercised locally against the shared DB): submitted a
    mortgage "purchase" lead through the new form and confirmed
    `preapproval_status` correctly appeared and the resulting lead's
    columns/details matched exactly what the chat path would have
    produced, including `tenant_id` resolving to the submitting
    franchisee's own tenant; added a temporary boolean-dependent question
    pair (`has_bankruptcy` → `bankruptcy_year`) to `credit` and confirmed
    the fix via a real chat conversation both ways (year question appears
    on "yes," skipped on "no") and via the new form (same both ways, plus
    server-side rejection when a currently-visible required field is
    omitted, and no rejection when a now-hidden field is simply absent);
    confirmed franchisor/super_admin/service_provider can't reach
    `/dashboard/leads/new` and don't see the "Add lead" button; confirmed
    submitted leads appear correctly in the franchisee's own Leads list.
    All test leads/sessions/the temporary question pair removed afterward.

28. ✅ Adding a *new* franchisee is now `super_admin`-only — franchisor
    lost this one specific capability (everything else they could already
    do — editing an existing franchisee, adding/editing service providers
    — is unchanged). `createFranchisee` in `web/src/lib/db/accounts.ts`
    got its own stricter check (`actingRole !== "super_admin"`) instead of
    the shared `ACCOUNT_CREATOR_ROLES`/`assertCanCreateAccounts` every
    other account-creation function still uses — same pattern
    `createAdminUser` already used for the same reason (roadmap item 18).
    `/dashboard/franchisees/new` redirects franchisor away, and the "Add
    franchisee" button on `/dashboard/franchisees` only renders for
    `super_admin`. Verified franchisor still sees/can use "Add provider"
    and can still edit an existing franchisee — only franchisee *creation*
    changed.

29. ✅ Dashboard re-themed dark ("Nocturne") — re-tuned the existing
    Forest/Moss/Gold token set in `web/src/app/globals.css` from the
    original light palette to a deep-night one, in place, rather than
    adding a toggle. Because the whole dashboard shell (cards, buttons,
    badges, tables, the login/reset pages) is built on that one set of
    CSS custom properties (`web/src/lib/dashboard-ui.ts`,
    `status-badge.tsx`'s `TONE_CLASSES`, etc.), redefining the token
    values re-themed nearly everything without touching component code.

    A few pairings only worked under light-mode assumptions and needed
    direct fixes instead of a pure variable swap: `page-header.tsx`'s and
    the course-lesson-list icon chips did dark-text-on-light-chip
    (`bg-sage-tint text-forest`) — switched to a moss-tinted chip
    (`bg-moss/15 text-moss`) that still reads once `sage-tint` itself is
    dark; the sidebar's active nav pill and `entity-row.tsx`'s avatar
    circle put white text on solid `bg-moss` — fine against the old dark
    moss, but the brighter moss this theme needs for moss-as-*text*
    legibility elsewhere drops white-on-moss contrast too low, so those
    two switched to dark text instead; `chart-theme.tsx`'s chart
    surface/grid/categorical colors are hardcoded (not routed through the
    CSS tokens), so it got its own dark-tuned values; TipTap's rendered
    and editable rich text uses Tailwind Typography's `prose` class,
    which ships its own light-mode text colors regardless of the app's
    tokens — added `prose-invert` everywhere it's used (course lesson
    view, lesson notes, the editor itself) or it would've rendered
    dark-on-dark. Every text/background pairing was checked against WCAG
    contrast math before picking final hex values, not eyeballed.

    Went out to production via a PR (not a direct push to `main`) since
    this is a broad, subjective visual change rather than a scoped
    feature — but this Railway project turned out to have no PR/preview
    environments actually configured (`railway environment list` shows
    only `production`, despite the Hosting section above describing that
    workflow), so there was no live preview URL to review before
    merging; merged straight to `main` after local verification instead,
    per the user's choice when asked. Verified end-to-end: clean
    `tsc`/build, compiled CSS contains the new token values both locally
    and on production, and `/dashboard`, `/dashboard/leads`,
    `/dashboard/franchisees`, `/dashboard/courses`,
    `/dashboard/chat-services` all render 200 with no server errors in
    both places (no screenshot/browser tool available this session, so
    this was verified structurally — HTML/CSS output and render status —
    rather than visually).

Both the original roadmap items are done. Next up is whatever's needed
next — nothing currently queued.

## Known gaps / things to revisit

- Railway **PR/preview environments are not actually enabled** on this
  project, despite the Hosting section above describing that as the
  workflow — `railway environment list` shows only `production`, no
  environment has ever been created per-PR, and opening a real PR (#1,
  the dashboard dark-theme redesign) produced no preview URL or Railway
  check/comment. Enabling it is a one-time Railway dashboard setting
  (Settings → Environments → PR deploys) tied to the account's
  authenticated session — not something scriptable via `railway` CLI, so
  it needs to be turned on interactively by whoever's logged into
  Railway, same category of action as the original project/service
  creation. Until then, anything that'd benefit from a live preview
  before merging (visual/design changes especially) has no choice but to
  verify locally and merge straight to `main`.
- `RESEND_API_KEY` is **not** set on Railway `web` OR `agent` yet —
  forgot-password reset links, the lead-assigned/lead-created
  notifications, and the daily digest are all only landing in each
  service's Railway deploy logs right now, not real inboxes (confirmed
  via `railway logs --service web` / `--service agent`). Set
  `RESEND_API_KEY` on **both** services (same Resend account/key works
  for both — `web` sends password-reset/lead-assigned/daily-digest,
  `agent` sends the franchisee lead-created notification) and
  `APP_PUBLIC_URL` on `agent` (same value as `web`'s
  `NEXT_PUBLIC_APP_URL`, needed to build the "View this lead" link) to
  turn on real delivery. Optionally also `RESEND_FROM_EMAIL` on both once
  a sending domain is verified in Resend — until then it falls back to
  their sandbox `onboarding@resend.dev`, which only delivers to the email
  on the Resend account. No code change needed, same on/off-by-env-var
  pattern as `OPENAI_API_KEY` below.
- `OPENAI_API_KEY` is set on Railway `agent` — the chat agent uses real
  OpenAI tool-calling for both question phrasing and answer extraction in
  production, not the deterministic fallback (that fallback still exists
  in `agent/app/openai_helper.py` and kicks in automatically if the key
  is ever unset, e.g. local dev without one).
- `AUTH_SECRET` and `AUTH_URL` are both set on Railway `web` (different
  `AUTH_SECRET` value than the local `.env.local` one). `AUTH_URL` is
  required in production — Auth.js's automatic host-detection picks up an
  incorrect `x-forwarded-host` behind Railway's proxy otherwise, which
  broke sign-out redirects until this was set explicitly. Pinning
  `AUTH_URL` to one fixed domain introduced a second, multi-tenant-only
  bug: Auth.js's default `redirect` callback resolves any relative
  `callbackUrl` (e.g. `"/login"`) against that fixed `AUTH_URL`, so every
  tenant's sign-out button was landing on the same fixed domain instead
  of staying on whatever tenant domain the user was actually on. Fixed
  with a custom `redirect` callback in `web/src/lib/auth/config.ts` that
  honors an absolute `callbackUrl` as-is instead of coercing it to
  `AUTH_URL`, plus `SignOutButton` (`web/src/app/dashboard/`) now passes
  `` `${window.location.origin}/login` `` instead of a bare relative path.
  Safe to trust that URL unvalidated because `SignOutButton` is the only
  caller anywhere in the app that supplies a `callbackUrl` at all — there
  is no `?callbackUrl=`-from-query-string path for an attacker to feed a
  cross-origin URL through the same callback.
- No `chat_sessions.status = 'abandoned'` detection yet — messages are all
  logged regardless, so the raw data for later drop-off analysis exists,
  but nothing marks a session abandoned after inactivity.
- Dashboard now has a proper shell (`web/src/app/dashboard/layout.tsx` —
  top bar + role-filtered left sidebar, nav config in
  `web/src/lib/dashboard-nav.ts`) with content split into real routes
  (`/dashboard` Overview with analytics, `/dashboard/leads`,
  `/dashboard/leads/[id]`, `/dashboard/franchisees` and
  `/dashboard/providers` for super_admin/franchisor only,
  `/dashboard/profile` for franchisee/service_provider) — this replaces
  the earlier single-page-that-branches-by-role version. Overview's three
  charts (status breakdown, service-type breakdown, 30-day trend) come
  from `getLeadAnalytics()` in `web/src/lib/db/leads.ts`, same
  role-scoping pattern as every other query. Colors follow the `dataviz`
  skill's palette — an ordinal blue ramp for pipeline progress
  (`web/src/components/charts/chart-theme.tsx`), not arbitrary hues.
