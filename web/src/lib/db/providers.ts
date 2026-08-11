import { sql } from "./client";
import type { Role } from "./context";

export type ServiceProvider = {
  id: string;
  companyName: string;
  serviceTypes: string[];
};

/**
 * `service_providers` has no RLS (not one of the brief's protected
 * tables — only leads/chat_messages/rebates are), so this app-layer role
 * check is the only gate. Only franchisor/super_admin need the full
 * roster, to assign leads.
 */
export async function listServiceProviders(role: Role): Promise<ServiceProvider[]> {
  if (role !== "super_admin" && role !== "franchisor") {
    throw new Error("Not authorized to list service providers.");
  }

  const rows = await sql<{ id: string; company_name: string; service_types: string[] }[]>`
    select id, company_name, service_types
    from service_providers
    order by company_name
  `;
  return rows.map((row) => ({ id: row.id, companyName: row.company_name, serviceTypes: row.service_types }));
}

export async function getServiceProviderById(providerId: string): Promise<ServiceProvider | null> {
  const rows = await sql<{ id: string; company_name: string; service_types: string[] }[]>`
    select id, company_name, service_types
    from service_providers
    where id = ${providerId}
    limit 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return { id: row.id, companyName: row.company_name, serviceTypes: row.service_types };
}
