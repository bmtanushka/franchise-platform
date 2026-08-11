import { headers } from "next/headers";
import type { Tenant } from "@/lib/db/tenants";

/**
 * Reads the tenant resolved by middleware (src/middleware.ts) out of the
 * request headers it injected. Server Components/route handlers should use
 * this instead of re-querying the domains table.
 */
export async function getResolvedTenant(): Promise<Tenant> {
  const h = await headers();
  const id = h.get("x-tenant-id");
  const type = h.get("x-tenant-type") as Tenant["type"] | null;
  const slug = h.get("x-tenant-slug");
  const name = h.get("x-tenant-name");
  const templateId = h.get("x-tenant-template-id");
  const templateComponentKey = h.get("x-tenant-template-key");

  if (!id || !type || !slug || !name || !templateComponentKey) {
    throw new Error("No tenant resolved for this request — middleware should have set it.");
  }

  return {
    id,
    type,
    slug,
    name,
    status: "active",
    templateId: templateId || null,
    templateComponentKey,
  };
}
