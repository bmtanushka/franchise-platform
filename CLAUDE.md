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
  some cases the franchisor directly) earns a rebate.
- Actual payout of rebates happens outside this system — we only need to
  track and display rebate amounts and a paid/pending flag.

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

Two root domains, both pointed at the same web service (currently
placeholders — treat as literal until real domains are provided):

- `franchisorbrand.com` — the franchisor's own site. Marketing + "find your
  local office" content. **Also runs the chat agent and captures leads
  directly** for national/online visitors — these leads are owned by the
  franchisor tenant outright, never routed to a franchisee, and the
  franchisor assigns them straight to a service provider in the relevant
  area. No rebate is created for franchisor-owned leads (see rebate logic
  below).
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

## Lead lifecycle

Status pipeline: `new → qualified → assigned_to_provider → in_progress →
won / lost / disqualified`. Every status change is logged to
`lead_status_history` with who changed it and an optional note.

- Franchisee-site leads: `tenant_id` = that franchisee, set at creation.
- Franchisor-site leads: `tenant_id` = the franchisor's own tenant row
  (franchisor is just another row in `tenants`, type `franchisor`). Never
  reassigned to a franchisee.
- Franchisor assigns leads to a `service_provider` (manual selection in v1).
- Service providers update status as they work the deal and set
  `deal_value` on close.
- **Rebate creation rule**: on status → `won`, only create a `rebates` row
  if the lead's owning tenant is type `franchisee`. Franchisor-owned leads
  still get their full status history and `deal_value`, just no rebate row.

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
- Rebate creation always checks the owning tenant's type before inserting.

## Roadmap

1. ✅ Scaffold the repo structure above, initialize Next.js and FastAPI apps.
   Railway project/service creation is a manual step for the user (needs
   interactive account login) — `railway.toml` files are in place to make
   that fast once services exist.
2. Run the two migration files against Railway Postgres.
3. Build the tenant-resolution middleware (hostname → tenant lookup) and
   get the franchisor root site and one test franchisee site rendering
   from the same codebase with different contact details.
4. Wire up auth with role claims and the RLS `set_config` wrapper; build
   the four dashboard shells with placeholder data to prove scoping works.
5. Build the FastAPI agent service with one service's question set
   end-to-end (conversation → tool-call extraction → lead written →
   chat history logged), then extend to the remaining 4 services.
6. Build the lead status pipeline UI: franchisor assignment to providers,
   provider status updates, franchisee/franchisor lead visibility.
7. Build rebate calculation on `won` status and the pending/paid toggle.

Next up: step 2 (run migrations against Railway Postgres) once a Railway
Postgres instance exists, or step 3 (tenant-resolution middleware), which
can start locally against any Postgres instance.
