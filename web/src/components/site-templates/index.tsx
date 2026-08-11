import type { Tenant } from "@/lib/db/tenants";
import type { SiteContentMap, FranchiseeProfile } from "@/lib/db/site-content";
import { StandardTemplate } from "./standard";

export type SiteTemplateProps = {
  tenant: Tenant;
  siteContent: SiteContentMap;
  franchiseeProfile: FranchiseeProfile | null;
};

// Every template reads the same content model (siteContent + optional
// franchiseeProfile) — this registry is the only place a tenant's
// template_id/component_key gets mapped to an actual layout component.
const SITE_TEMPLATES: Record<string, (props: SiteTemplateProps) => React.ReactElement> = {
  standard: StandardTemplate,
};

export function renderSiteTemplate(props: SiteTemplateProps) {
  const Template = SITE_TEMPLATES[props.tenant.templateComponentKey] ?? StandardTemplate;
  return <Template {...props} />;
}
