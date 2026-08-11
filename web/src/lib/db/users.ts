import { sql } from "./client";
import type { Role } from "./context";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  tenantId: string | null;
  fullName: string | null;
  passwordHash: string | null;
};

/**
 * Credential lookup for the NextAuth authorize() callback. Not
 * tenant-scoped by definition — resolving "who is this login" has to run
 * before we know which tenant/role context to apply.
 */
export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const rows = await sql<
    {
      id: string;
      email: string;
      role: Role;
      tenant_id: string | null;
      full_name: string | null;
      password_hash: string | null;
    }[]
  >`
    select id, email, role, tenant_id, full_name, password_hash
    from users
    where email = ${email}
    limit 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    tenantId: row.tenant_id,
    fullName: row.full_name,
    passwordHash: row.password_hash,
  };
}

/**
 * Resolves the service_providers.id for a service_provider-role user, used
 * to populate app.current_provider_id for RLS scoping.
 */
export async function getProviderIdForUser(userId: string): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    select id from service_providers where user_id = ${userId} limit 1
  `;
  return rows.length > 0 ? rows[0].id : null;
}
