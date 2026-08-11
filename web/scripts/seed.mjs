// One-off seed script for local/dev testing: registers the two test
// domains, one test franchisee tenant, default site content, and one user
// per role. Safe to re-run — every insert is idempotent (on conflict do
// nothing / upsert).
//
// Usage: DATABASE_URL=... node scripts/seed.mjs
import postgres from "postgres";
import bcrypt from "bcryptjs";

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL?.includes("127.0.0.1") ? false : "require",
});

const TEST_PASSWORD = "Passw0rd!";

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const [franchisor] = await sql`select id from tenants where slug = 'root' limit 1`;
  if (!franchisor) throw new Error("Franchisor root tenant not found — run migration 001 first.");

  const [standardTemplate] = await sql`
    select id from site_templates where component_key = 'standard' limit 1
  `;

  // --- Domains for the franchisor root site ---
  await sql`
    insert into domains (domain, tenant_id, domain_type, verified)
    values
      ('web-production-80ea6d.up.railway.app', ${franchisor.id}, 'root', true),
      ('localhost:3000', ${franchisor.id}, 'root', true)
    on conflict (domain) do nothing
  `;

  // --- Test franchisee tenant ---
  const [va1] = await sql`
    insert into tenants (type, slug, name, status, template_id)
    values ('franchisee', 'va1', 'Virginia Office 1', 'active', ${standardTemplate.id})
    on conflict (slug) do update set name = excluded.name
    returning id
  `;

  await sql`
    insert into domains (domain, tenant_id, domain_type, verified)
    values ('va1.localhost:3000', ${va1.id}, 'subdomain', true)
    on conflict (domain) do nothing
  `;

  await sql`
    insert into franchisee_profile (tenant_id, phone, email, address, business_hours, local_blurb)
    values (
      ${va1.id},
      '(703) 555-0142',
      'contact@va1.franchiseenetwork.com',
      '4200 Market St, Arlington, VA 22203',
      'Mon-Fri 9am-6pm ET',
      'Locally owned and operated, serving Northern Virginia since 2019.'
    )
    on conflict (tenant_id) do update set
      phone = excluded.phone,
      email = excluded.email,
      address = excluded.address,
      business_hours = excluded.business_hours,
      local_blurb = excluded.local_blurb
  `;

  // --- Global default site content (franchisor tenant_id = null) ---
  await sql`
    insert into site_content (tenant_id, section_key, content)
    values
      (null, 'hero', ${sql.json({
        headline: "Financing made simple, from application to close.",
        subheadline:
          "Credit, mortgage, real estate, foreign national credit, and business credit — all under one roof.",
      })}),
      (null, 'services_intro', ${sql.json({
        heading: "What we help with",
        services: [
          { key: "credit", label: "Credit facilities" },
          { key: "mortgage", label: "Mortgage" },
          { key: "real_estate", label: "Real estate" },
          { key: "foreign_national_credit", label: "Foreign national credit facility" },
          { key: "business_credit", label: "Business credit" },
        ],
      })})
    on conflict (tenant_id, section_key) do update set content = excluded.content
  `;

  // --- One test user per role ---
  const users = [
    { email: "admin@franchiseplatform.test", role: "super_admin", tenant_id: null, full_name: "Super Admin" },
    { email: "franchisor@franchiseplatform.test", role: "franchisor", tenant_id: franchisor.id, full_name: "Franchisor HQ" },
    { email: "va1@franchiseplatform.test", role: "franchisee", tenant_id: va1.id, full_name: "Virginia Office 1 Owner" },
    { email: "provider1@franchiseplatform.test", role: "service_provider", tenant_id: null, full_name: "Test Mortgage Broker" },
  ];

  for (const u of users) {
    await sql`
      insert into users (email, role, tenant_id, full_name, password_hash)
      values (${u.email}, ${u.role}, ${u.tenant_id}, ${u.full_name}, ${passwordHash})
      on conflict (email) do update set
        role = excluded.role,
        tenant_id = excluded.tenant_id,
        password_hash = excluded.password_hash
    `;
  }

  const [providerUser] = await sql`select id from users where email = 'provider1@franchiseplatform.test'`;
  await sql`
    insert into service_providers (user_id, company_name, service_types)
    values (${providerUser.id}, 'Test Mortgage Brokerage', array['mortgage', 'credit'])
    on conflict (user_id) do nothing
  `;

  console.log("Seed complete.");
  console.log(`Test login password for all seeded users: ${TEST_PASSWORD}`);
  for (const u of users) console.log(`  ${u.role.padEnd(18)} ${u.email}`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
