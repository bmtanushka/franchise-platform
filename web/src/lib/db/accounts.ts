import bcrypt from "bcryptjs";
import { sql } from "./client";
import type { Role } from "./context";

// tenants/franchisee_profile/users/service_providers carry no RLS (only
// leads/chat_messages/rebates do per the brief) — this role check is the
// only gate, same pattern as listServiceProviders in providers.ts.
const ACCOUNT_CREATOR_ROLES = new Set<Role>(["super_admin", "franchisor"]);

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

      return { tenantId: tenant.id as string };
    });
  } catch (err) {
    rethrowAsConflict(err);
  }
}

export type CreateServiceProviderInput = {
  companyName: string;
  serviceTypes: string[];
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
        insert into service_providers (user_id, company_name, service_types)
        values (${user.id}, ${input.companyName}, ${input.serviceTypes})
        returning id
      `;

      return { providerId: provider.id as string };
    });
  } catch (err) {
    rethrowAsConflict(err);
  }
}
