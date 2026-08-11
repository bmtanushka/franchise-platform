import { NextRequest, NextResponse } from "next/server";
import { getTenantByDomain } from "@/lib/db/tenants";

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

  return NextResponse.next({ request: { headers: requestHeaders } });
}
