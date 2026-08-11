import { sql } from "./client";

export type ServiceProvider = {
  id: string;
  companyName: string;
  serviceTypes: string[];
};

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
