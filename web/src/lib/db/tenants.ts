import { sql } from "./client";

export type Tenant = {
  id: string;
  type: "franchisor" | "franchisee";
  slug: string;
  name: string;
  status: "active" | "suspended" | "onboarding";
  templateId: string | null;
  templateComponentKey: string;
};

const DEFAULT_TEMPLATE_COMPONENT_KEY = "standard";

/**
 * Tenant resolution entry point used by middleware: given the request's
 * hostname, find the tenant it belongs to via the `domains` table. This is
 * the only place hostname -> tenant lookups should happen.
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const rows = await sql<
    {
      id: string;
      type: "franchisor" | "franchisee";
      slug: string;
      name: string;
      status: "active" | "suspended" | "onboarding";
      template_id: string | null;
      component_key: string | null;
    }[]
  >`
    select t.id, t.type, t.slug, t.name, t.status, t.template_id, st.component_key
    from domains d
    join tenants t on t.id = d.tenant_id
    left join site_templates st on st.id = t.template_id
    where d.domain = ${domain}
    limit 1
  `;

  if (rows.length === 0) return null;
  return toTenant(rows[0]);
}

/** franchisor/super_admin dashboard view — every tenant in the system. */
export async function listTenants(): Promise<Tenant[]> {
  const rows = await sql<
    {
      id: string;
      type: "franchisor" | "franchisee";
      slug: string;
      name: string;
      status: "active" | "suspended" | "onboarding";
      template_id: string | null;
      component_key: string | null;
    }[]
  >`
    select t.id, t.type, t.slug, t.name, t.status, t.template_id, st.component_key
    from tenants t
    left join site_templates st on st.id = t.template_id
    order by t.type, t.name
  `;

  return rows.map(toTenant);
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const rows = await sql<
    {
      id: string;
      type: "franchisor" | "franchisee";
      slug: string;
      name: string;
      status: "active" | "suspended" | "onboarding";
      template_id: string | null;
      component_key: string | null;
    }[]
  >`
    select t.id, t.type, t.slug, t.name, t.status, t.template_id, st.component_key
    from tenants t
    left join site_templates st on st.id = t.template_id
    where t.id = ${tenantId}
    limit 1
  `;

  if (rows.length === 0) return null;
  return toTenant(rows[0]);
}

function toTenant(row: {
  id: string;
  type: "franchisor" | "franchisee";
  slug: string;
  name: string;
  status: "active" | "suspended" | "onboarding";
  template_id: string | null;
  component_key: string | null;
}): Tenant {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    name: row.name,
    status: row.status,
    templateId: row.template_id,
    templateComponentKey: row.component_key ?? DEFAULT_TEMPLATE_COMPONENT_KEY,
  };
}
