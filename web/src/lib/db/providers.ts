import { sql } from "./client";
import type { Role } from "./context";

export type ServiceArea = { state: string; stateName: string; cities: string[] };

export type ServiceProvider = {
  id: string;
  companyName: string;
  serviceTypes: string[];
  serviceAreas: ServiceArea[];
};

type ServiceProviderRow = {
  id: string;
  company_name: string;
  service_types: string[];
  service_areas: ServiceArea[];
};

function toServiceProvider(row: ServiceProviderRow): ServiceProvider {
  return {
    id: row.id,
    companyName: row.company_name,
    serviceTypes: row.service_types,
    serviceAreas: row.service_areas ?? [],
  };
}

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

  const rows = await sql<ServiceProviderRow[]>`
    select id, company_name, service_types, service_areas
    from service_providers
    order by company_name
  `;
  return rows.map(toServiceProvider);
}

export type ServiceType = { key: string; name: string };

export async function listServiceTypes(): Promise<ServiceType[]> {
  // Excludes corporate_only services (e.g. franchise_interest — people
  // wanting to open a franchise themselves, never a service a business-
  // service provider "handles") and deactivated ones, generally rather
  // than hardcoded by key — any future corporate-only or deactivated
  // service is automatically excluded too.
  const rows = await sql<ServiceType[]>`
    select key, name from service_types where not corporate_only and is_active order by name
  `;
  return rows;
}

/** Login email for a provider's account — used to send the lead-assigned notification. */
export async function getProviderContactEmail(
  providerId: string,
): Promise<{ email: string; companyName: string } | null> {
  const rows = await sql<{ email: string; company_name: string }[]>`
    select u.email, sp.company_name
    from service_providers sp
    join users u on u.id = sp.user_id
    where sp.id = ${providerId}
    limit 1
  `;
  return rows.length > 0 ? { email: rows[0].email, companyName: rows[0].company_name } : null;
}

export async function getServiceProviderById(providerId: string): Promise<ServiceProvider | null> {
  const rows = await sql<ServiceProviderRow[]>`
    select id, company_name, service_types, service_areas
    from service_providers
    where id = ${providerId}
    limit 1
  `;

  if (rows.length === 0) return null;
  return toServiceProvider(rows[0]);
}
