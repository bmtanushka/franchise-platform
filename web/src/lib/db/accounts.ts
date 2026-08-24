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
  // Deliberately stricter than the shared ACCOUNT_CREATOR_ROLES (which
  // still lets franchisor create service providers, and edit an existing
  // franchisee) — only a super_admin can add a *new* franchisee tenant.
  if (actingRole !== "super_admin") {
    throw new Error("Only a super admin can add a new franchisee.");
  }

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

export type CreateAdminUserInput = {
  fullName: string;
  loginEmail: string;
  loginPassword: string;
  role: "super_admin" | "franchisor";
};

/**
 * Adds another super_admin or franchisor login. Deliberately stricter than
 * ACCOUNT_CREATOR_ROLES/assertCanCreateAccounts (which also allows
 * franchisor to create franchisees/providers) — only a super_admin can
 * grant admin-level access, so a franchisor account can never create a
 * peer or a super_admin for itself.
 *
 * A franchisor-role user's tenant_id points at the singleton franchisor
 * tenant (same as the seeded one) so they see the same platform-wide data
 * every other franchisor user does; super_admin has no tenant.
 */
export async function createAdminUser(
  actingRole: Role,
  input: CreateAdminUserInput,
): Promise<{ userId: string }> {
  if (actingRole !== "super_admin") {
    throw new Error("Only a super admin can add admin or franchisor accounts.");
  }

  const passwordHash = await bcrypt.hash(input.loginPassword, 10);

  let tenantId: string | null = null;
  if (input.role === "franchisor") {
    const [franchisorTenant] = await sql<{ id: string }[]>`
      select id from tenants where type = 'franchisor' limit 1
    `;
    tenantId = franchisorTenant?.id ?? null;
  }

  try {
    const [user] = await sql<{ id: string }[]>`
      insert into users (email, role, tenant_id, full_name, password_hash)
      values (${input.loginEmail}, ${input.role}, ${tenantId}, ${input.fullName}, ${passwordHash})
      returning id
    `;
    return { userId: user.id as string };
  } catch (err) {
    rethrowAsConflict(err);
  }
}

export type UpdateAdminUserInput = {
  fullName: string;
  role: "super_admin" | "franchisor";
};

/**
 * Edits a super_admin/franchisor account's name and role. Login email
 * isn't editable here, same reasoning as franchisee/provider edit not
 * touching login identity — that's a separate concern.
 *
 * Two lockout guards, since super_admin is the only role that can even
 * reach this page: you can't change your *own* role (a self-demotion —
 * or, just as bad, fat-fingering a role change on your own row — could
 * lock you out of this page entirely), and you can't demote the last
 * remaining super_admin (would zero out the role that can grant it).
 */
export async function updateAdminUser(
  actingRole: Role,
  actingUserId: string | null,
  targetUserId: string,
  input: UpdateAdminUserInput,
): Promise<void> {
  if (actingRole !== "super_admin") {
    throw new Error("Only a super admin can edit admin or franchisor accounts.");
  }

  const [target] = await sql<{ role: "super_admin" | "franchisor" }[]>`
    select role from users where id = ${targetUserId} and role in ('super_admin', 'franchisor') limit 1
  `;
  if (!target) {
    throw new Error("Account not found.");
  }

  if (actingUserId === targetUserId && input.role !== target.role) {
    throw new Error("You can't change your own role.");
  }

  if (target.role === "super_admin" && input.role !== "super_admin") {
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from users where role = 'super_admin'
    `;
    if (count <= 1) {
      throw new Error("Can't change the last super admin's role — add another super admin first.");
    }
  }

  let tenantId: string | null = null;
  if (input.role === "franchisor") {
    const [franchisorTenant] = await sql<{ id: string }[]>`
      select id from tenants where type = 'franchisor' limit 1
    `;
    tenantId = franchisorTenant?.id ?? null;
  }

  await sql`
    update users
    set full_name = ${input.fullName}, role = ${input.role}, tenant_id = ${tenantId}, updated_at = now()
    where id = ${targetUserId}
  `;
}
