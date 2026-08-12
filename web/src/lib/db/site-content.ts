import { sql } from "./client";

export type SiteContentMap = Record<string, unknown>;

/**
 * Merges the franchisor's global default content (tenant_id = null) with
 * any franchisee-specific overrides for the same section_key. Franchisee
 * overrides win. This is the only place site_content should be read from.
 */
export async function getSiteContent(tenantId: string): Promise<SiteContentMap> {
  const rows = await sql<{ tenant_id: string | null; section_key: string; content: unknown }[]>`
    select tenant_id, section_key, content
    from site_content
    where tenant_id is null or tenant_id = ${tenantId}
    order by tenant_id nulls first
  `;

  const merged: SiteContentMap = {};
  for (const row of rows) {
    merged[row.section_key] = row.content;
  }
  return merged;
}

export type FranchiseeProfile = {
  phone: string | null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
  localBlurb: string | null;
};

const FRANCHISEE_EDITABLE_FIELDS = ["phone", "email", "address", "businessHours", "localBlurb"] as const;

export async function getFranchiseeProfile(tenantId: string): Promise<FranchiseeProfile | null> {
  const rows = await sql<
    {
      phone: string | null;
      email: string | null;
      address: string | null;
      business_hours: string | null;
      local_blurb: string | null;
    }[]
  >`
    select phone, email, address, business_hours, local_blurb
    from franchisee_profile
    where tenant_id = ${tenantId}
    limit 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    phone: row.phone,
    email: row.email,
    address: row.address,
    businessHours: row.business_hours,
    localBlurb: row.local_blurb,
  };
}

/**
 * Franchisee self-edit endpoint. Whitelists fields at the API layer, not
 * just the UI — any extra keys on `updates` are silently ignored rather
 * than accepted, per the brief's field-whitelist requirement.
 */
export async function updateFranchiseeProfile(
  tenantId: string,
  updates: Partial<FranchiseeProfile>,
): Promise<void> {
  const whitelisted = Object.fromEntries(
    Object.entries(updates).filter(([key]) =>
      (FRANCHISEE_EDITABLE_FIELDS as readonly string[]).includes(key),
    ),
  ) as Partial<FranchiseeProfile>;

  await sql`
    update franchisee_profile
    set
      phone = coalesce(${whitelisted.phone ?? null}, phone),
      email = coalesce(${whitelisted.email ?? null}, email),
      address = coalesce(${whitelisted.address ?? null}, address),
      business_hours = coalesce(${whitelisted.businessHours ?? null}, business_hours),
      local_blurb = coalesce(${whitelisted.localBlurb ?? null}, local_blurb),
      updated_at = now()
    where tenant_id = ${tenantId}
  `;
}

export type SiteTemplateOption = { id: string; name: string; componentKey: string };

export async function listSiteTemplates(): Promise<SiteTemplateOption[]> {
  const rows = await sql<{ id: string; name: string; component_key: string }[]>`
    select id, name, component_key from site_templates order by name
  `;
  return rows.map((r) => ({ id: r.id, name: r.name, componentKey: r.component_key }));
}

/**
 * Franchisee self-service template picker — choosing a layout is treated
 * the same as editing their own contact details (no franchisor approval
 * needed), unlike renaming the business or changing its subdomain.
 */
export async function updateTenantTemplate(tenantId: string, templateId: string): Promise<void> {
  await sql`update tenants set template_id = ${templateId}, updated_at = now() where id = ${tenantId}`;
}
