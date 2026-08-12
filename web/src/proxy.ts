import { NextRequest, NextResponse } from "next/server";
import { getTenantByDomain } from "@/lib/db/tenants";
import { CORPORATE_PATHS, normalizeCorporatePath } from "@/lib/corporate-site";
import { FRANCHISEE_SITE_PATHS, normalizeFranchiseeSitePath } from "@/lib/franchisee-site";

// Proxy defaults to the Node.js runtime in Next.js 16, which is required
// here since tenant resolution needs a real Postgres connection.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");

  if (!host) {
    return new NextResponse("Missing Host header", { status: 400 });
  }

  const tenant = await getTenantByDomain(host);

  if (!tenant) {
    return new NextResponse(
      `This domain (${host}) isn't registered to a tenant yet.`,
      { status: 404 },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-type", tenant.type);
  requestHeaders.set("x-tenant-slug", tenant.slug);
  requestHeaders.set("x-tenant-name", tenant.name);
  requestHeaders.set("x-tenant-template-id", tenant.templateId ?? "");
  requestHeaders.set("x-tenant-template-key", tenant.templateComponentKey);

  const pathname = normalizeCorporatePath(request.nextUrl.pathname);

  if (tenant.type === "franchisor") {
    // The corporate nav's "Franchisee Portal" link goes straight to our
    // real login, not a static page.
    if (pathname === "/franchisee-portal") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (CORPORATE_PATHS.has(pathname)) {
      const rewriteUrl = new URL(`/corp${pathname === "/" ? "" : pathname}`, request.url);
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
  }

  if (tenant.type === "franchisee" && tenant.templateComponentKey === "luna-verde-franchisee") {
    const franchiseePath = normalizeFranchiseeSitePath(request.nextUrl.pathname);
    if (FRANCHISEE_SITE_PATHS.has(franchiseePath)) {
      const rewriteUrl = new URL(`/franchisee-site${franchiseePath === "/" ? "" : franchiseePath}`, request.url);
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}
