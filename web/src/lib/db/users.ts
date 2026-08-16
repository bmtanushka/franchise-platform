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

/** Looks up the caller's own account by session id — used by the change-password flow. */
export async function getUserById(id: string): Promise<AuthUser | null> {
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
    where id = ${id}
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

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await sql`update users set password_hash = ${passwordHash}, updated_at = now() where id = ${userId}`;
}

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "super_admin" | "franchisor";
  createdAt: string;
};

/**
 * super_admin/franchisor accounts only — franchisee and service_provider
 * logins already have their own management pages (Franchisees, Providers)
 * tied to their tenant/profile row, so this deliberately doesn't overlap
 * with those. super_admin-only, enforced here as well as by the caller.
 */
export async function listAdminUsers(role: Role): Promise<AdminUser[]> {
  if (role !== "super_admin") {
    throw new Error("Only a super admin can view admin/franchisor accounts.");
  }

  const rows = await sql<
    { id: string; email: string; full_name: string | null; role: "super_admin" | "franchisor"; created_at: string }[]
  >`
    select id, email, full_name, role, created_at
    from users
    where role in ('super_admin', 'franchisor')
    order by created_at desc
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
  }));
}

export async function getAdminUserById(role: Role, id: string): Promise<AdminUser | null> {
  if (role !== "super_admin") {
    throw new Error("Only a super admin can view admin/franchisor accounts.");
  }

  const rows = await sql<
    { id: string; email: string; full_name: string | null; role: "super_admin" | "franchisor"; created_at: string }[]
  >`
    select id, email, full_name, role, created_at
    from users
    where id = ${id} and role in ('super_admin', 'franchisor')
    limit 1
  `;

  if (rows.length === 0) return null;
  const row = rows[0];
  return { id: row.id, email: row.email, fullName: row.full_name, role: row.role, createdAt: row.created_at };
}

export type SummaryRecipient = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  tenantId: string | null;
  providerId: string | null;
};

/**
 * Every login account, for the daily digest — one row per user regardless
 * of role, with providerId resolved the same way getProviderIdForUser does
 * (needed to build a SessionContext per recipient so getLeadAnalytics
 * applies the exact same role-scoping it uses everywhere else).
 */
export async function listSummaryRecipients(): Promise<SummaryRecipient[]> {
  const rows = await sql<
    { id: string; email: string; full_name: string | null; role: Role; tenant_id: string | null; provider_id: string | null }[]
  >`
    select u.id, u.email, u.full_name, u.role, u.tenant_id, sp.id as provider_id
    from users u
    left join service_providers sp on sp.user_id = u.id
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    tenantId: row.tenant_id,
    providerId: row.provider_id,
  }));
}
