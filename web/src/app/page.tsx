import { getResolvedTenant } from "@/lib/tenant";
import { getSiteContent, getFranchiseeProfile } from "@/lib/db/site-content";
import { renderSiteTemplate } from "@/components/site-templates";

export default async function Home() {
  const tenant = await getResolvedTenant();
  const siteContent = await getSiteContent(tenant.id);
  const franchiseeProfile = tenant.type === "franchisee" ? await getFranchiseeProfile(tenant.id) : null;

  return renderSiteTemplate({ tenant, siteContent, franchiseeProfile });
}
