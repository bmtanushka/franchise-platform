import postgres from "postgres";
import { sql } from "./client";

export type Role = "super_admin" | "franchisor" | "franchisee" | "service_provider";

export type SessionContext = {
  role: Role;
  tenantId: string | null;
  providerId: string | null;
};

/**
 * Every authenticated, tenant/role-scoped query goes through this wrapper.
 * It sets the RLS session variables inside a transaction (local to that
 * transaction only) before running the callback, so `leads`/`chat_messages`/
 * `rebates` RLS policies see the same role/tenant the app layer scoped by.
 */
export async function withTenantContext<T>(
  ctx: SessionContext,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_role', ${ctx.role}, true)`;
    await tx`select set_config('app.current_tenant_id', ${ctx.tenantId ?? ""}, true)`;
    await tx`select set_config('app.current_provider_id', ${ctx.providerId ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}
