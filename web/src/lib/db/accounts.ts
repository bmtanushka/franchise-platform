import bcrypt from "bcryptjs";
import type postgres from "postgres";
import { sql } from "./client";
import type { Role } from "./context";
import type { ServiceArea } from "./providers";

// tenants/franchisee_profile/users/service_providers carry no RLS (only
// leads/chat_messages/rebates do per the brief) — this role check is the
// only gate, same pattern as listServiceProviders in providers.ts.
const ACCOUNT_CREATOR_ROLES = new Set<Role>(["super_admin", "franchisor"]);

// Real wildcard domain (*.lv-5.com) pointed at Railway — see CLAUDE.md.
// Every franchisee's subdomain lives here; local dev keeps its separate
// `{slug}.localhost:3000` domains rows untouched (different domain_type
// query below only ever touches the lv-5.com one).
const FRANCHISEE_ROOT_DOMAIN = "lv-5.com";

/**
 * Keeps the domains table in sync with a franchisee's current slug —
 * delete-then-insert rather than update-in-place so it works whether or
 * not a row already exists yet (e.g. tenants created before this domain
 * existed), without needing to know the previous slug.
 */
async function syncFranchiseeDomain(
  tx: postgres.TransactionSql,
  tenantId: string,
  slug: string,
): Promise<void> {
  await tx`
    delete from domains
    where tenant_id = ${tenantId} and domain like ${"%." + FRANCHISEE_ROOT_DOMAIN}
  `;
  await tx`
    insert into domains (domain, tenant_id, domain_type, verified)
    values (${`${slug}.${FRANCHISEE_ROOT_DOMAIN}`}, ${tenantId}, 'subdomain', true)
    on conflict (domain) do update set tenant_id = excluded.tenant_id, verified = true
  `;
}

export class AccountConflictError extends Error {
  constructor(public field: "slug" | "email") {
    super(field === "slug" ? "That subdomain is already taken." : "That email is already in use.");
  }
}

function assertCanCreateAccounts(role: Role) {
  if (!ACCOUNT_CREATOR_ROLES.has(role)) {
    throw new Error("Only the franchisor can add accounts.");
  }
}

function rethrowAsConflict(err: unknown): never {
  const pgErr = err as { code?: string; constraint_name?: string };
  if (pgErr?.code === "23505") {
    if (pgErr.constraint_name === "tenants_slug_key") throw new AccountConflictError("slug");
    if (pgErr.constraint_name === "users_email_key") throw new AccountConflictError("email");
  }
  throw err;
}

export type CreateFranchiseeInput = {
  name: string;
  slug: string;
  status: "active" | "onboarding" | "suspended";
  phone: string | null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
  localBlurb: string | null;
  ownerFullName: string;
  loginEmail: string;
  loginPassword: string;
};

export async function createFranchisee(
  actingRole: Role,
  input: CreateFranchiseeInput,
): Promise<{ tenantId: string }> {
  assertCanCreateAccounts(actingRole);

  const [template] = await sql<{ id: string }[]>`
    select id from site_templates where component_key = 'standard' limit 1
  `;
  const passwordHash = await bcrypt.hash(input.loginPassword, 10);

  try {
    return await sql.begin(async (tx) => {
      const [tenant] = await tx<{ id: string }[]>`
        insert into tenants (type, slug, name, status, template_id)
        values ('franchisee', ${input.slug}, ${input.name}, ${input.status}, ${template?.id ?? null})
        returning id
      `;

      await tx`
        insert into franchisee_profile (tenant_id, phone, email, address, business_hours, local_blurb)
        values (${tenant.id}, ${input.phone}, ${input.email}, ${input.address}, ${input.businessHours}, ${input.localBlurb})
      `;

      await tx`
        insert into users (email, role, tenant_id, full_name, password_hash)
        values (${input.loginEmail}, 'franchisee', ${tenant.id}, ${input.ownerFullName}, ${passwordHash})
      `;

      await syncFranchiseeDomain(tx, tenant.id as string, input.slug);

      return { tenantId: tenant.id as string };
    });
  } catch (err) {
    rethrowAsConflict(err);
  }
}

export type UpdateFranchiseeInput = {
  name: string;
  slug: string;
  status: "active" | "onboarding" | "suspended";
  templateId: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
  localBlurb: string | null;
};

/**
 * Franchisor/super_admin editing a franchisee on their behalf — the full
 * set of fields, including identity (name/slug/status) that the
 * franchisee can't touch themselves (see updateTenantTemplate /
 * updateFranchiseeProfile in site-content.ts for the self-service
 * equivalent, which deliberately excludes these).
 */
export async function updateFranchiseeAdmin(
  actingRole: Role,
  tenantId: string,
  input: UpdateFranchiseeInput,
): Promise<void> {
  assertCanCreateAccounts(actingRole);

  try {
    await sql.begin(async (tx) => {
      await tx`
        update tenants
        set name = ${input.name}, slug = ${input.slug}, status = ${input.status}, template_id = ${input.templateId}, updated_at = now()
        where id = ${tenantId}
      `;

      await tx`
        update franchisee_profile
        set phone = ${input.phone}, email = ${input.email}, address = ${input.address},
            business_hours = ${input.businessHours}, local_blurb = ${input.localBlurb}, updated_at = now()
        where tenant_id = ${tenantId}
      `;

      await syncFranchiseeDomain(tx, tenantId, input.slug);
    });
  } catch (err) {
    rethrowAsConflict(err);
  }
}

export type CreateServiceProviderInput = {
  companyName: string;
  serviceTypes: string[];
  serviceAreas: ServiceArea[];
  fullName: string;
  loginEmail: string;
  loginPassword: string;
};

export async function createServiceProvider(
  actingRole: Role,
  input: CreateServiceProviderInput,
): Promise<{ providerId: string }> {
  assertCanCreateAccounts(actingRole);

  const passwordHash = await bcrypt.hash(input.loginPassword, 10);

  try {
    return await sql.begin(async (tx) => {
      const [user] = await tx<{ id: string }[]>`
        insert into users (email, role, tenant_id, full_name, password_hash)
        values (${input.loginEmail}, 'service_provider', null, ${input.fullName}, ${passwordHash})
        returning id
      `;

      const [provider] = await tx<{ id: string }[]>`
        insert into service_providers (user_id, company_name, service_types, service_areas)
        values (${user.id}, ${input.companyName}, ${input.serviceTypes}, ${sql.json(input.serviceAreas)})
        returning id
      `;

      return { providerId: provider.id as string };
    });
  } catch (err) {
    rethrowAsConflict(err);
  }
}

export type UpdateServiceProviderInput = {
  companyName: string;
  serviceTypes: string[];
  serviceAreas: ServiceArea[];
};

/**
 * Franchisor/super_admin editing a provider — company name, the services
 * they handle, and their coverage areas. Deliberately excludes login
 * email/password, same reasoning as updateFranchiseeAdmin not touching
 * the owner's login identity — that's a separate concern from the
 * business-facing profile fields.
 */
export async function updateServiceProvider(
  actingRole: Role,
  providerId: string,
  input: UpdateServiceProviderInput,
): Promise<void> {
  assertCanCreateAccounts(actingRole);

  await sql`
    update service_providers
    set company_name = ${input.companyName},
        service_types = ${input.serviceTypes},
        service_areas = ${sql.json(input.serviceAreas)}
    where id = ${providerId}
  `;
}
