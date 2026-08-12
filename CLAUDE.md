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
Railway side (`*.lv-5.com` added as a custom domain on `web`), but DNS
hasn't been pointed at Railway yet by the registrar — needs 3 records at
whoever holds `lv-5.com`: a `*` CNAME to Railway's traffic-routing target,
an `_acme-challenge` CNAME for the wildcard SSL cert, and a
`_railway-verify` TXT for domain-ownership verification (get the current
exact values with `railway domain status <domain-id> --service web`,
since the CNAME targets are project-specific and were generated when the
domain was added — don't reuse the ones from a past session). Every
franchisee's `{slug}.lv-5.com` row in `domains` is kept in sync
automatically on create/rename (`syncFranchiseeDomain()` in
`web/src/lib/db/accounts.ts`, delete-then-insert keyed off the tenant's
current slug) — this is separate from, and doesn't touch, that tenant's
local-dev `{slug}.localhost:3000` row.

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
  of the 5 services the visitor is interested in, then branches into that
  service's question set.
- Question sets live as structured data (JSON or a `service_question_sets`
  table), not hardcoded in prompts, so they can be tuned without a
  redeploy.
- On completion of all required fields, upsert a row into `leads` (setting
  `tenant_id` per the rules above) and give a closing message.
- **Every message, in and out, is written to `chat_messages` before the
  response returns** — including abandoned sessions, for later analysis of
  drop-off points and prompt tuning. `chat_sessions` tracks status
  (`active`/`completed`/`abandoned`) and links to the resulting lead once
  qualified.

## Database schema

Two migration files define the current schema, in `db/migrations/`, run
against the Railway Postgres instance in order:

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

Both the original roadmap items are done. Next up is whatever's needed
next — nothing currently queued.

## Known gaps / things to revisit

- `OPENAI_API_KEY` is set on Railway `agent` — the chat agent uses real
  OpenAI tool-calling for both question phrasing and answer extraction in
  production, not the deterministic fallback (that fallback still exists
  in `agent/app/openai_helper.py` and kicks in automatically if the key
  is ever unset, e.g. local dev without one).
- `AUTH_SECRET` and `AUTH_URL` are both set on Railway `web` (different
  `AUTH_SECRET` value than the local `.env.local` one). `AUTH_URL` is
  required in production — Auth.js's automatic host-detection picks up an
  incorrect `x-forwarded-host` behind Railway's proxy otherwise, which
  broke sign-out redirects until this was set explicitly.
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
