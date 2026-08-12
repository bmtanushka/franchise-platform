import { NextRequest, NextResponse } from "next/server";
import { getResolvedTenant } from "@/lib/tenant";
import { getFranchiseeProfile } from "@/lib/db/site-content";
import { renderFranchiseeSitePage } from "@/lib/franchisee-site";

// Internal render target for a franchisee's HTML site template — only
// ever reached via the rewrite in src/proxy.ts, never linked to directly.
// Re-checks tenant type + template selection itself as defense in depth,
// same pattern as /corp for the franchisor's site.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const tenant = await getResolvedTenant();
  if (tenant.type !== "franchisee" || tenant.templateComponentKey !== "luna-verde-franchisee") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { slug } = await params;
  const pathname = "/" + (slug ?? []).join("/");
  const profile = await getFranchiseeProfile(tenant.id);
  const html = renderFranchiseeSitePage(pathname, tenant, profile);

  if (!html) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
