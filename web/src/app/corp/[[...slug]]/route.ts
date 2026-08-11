import { NextRequest, NextResponse } from "next/server";
import { getResolvedTenant } from "@/lib/tenant";
import { renderCorporatePage } from "@/lib/corporate-site";

// Internal render target for the franchisor's corporate site — only ever
// reached via the rewrite in src/proxy.ts, never linked to directly. Still
// double-checks tenant type itself (defense in depth, same pattern as the
// rest of the app: never trust a single layer of routing/scoping).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const tenant = await getResolvedTenant();
  if (tenant.type !== "franchisor") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { slug } = await params;
  const pathname = "/" + (slug ?? []).join("/");
  const html = renderCorporatePage(pathname);

  if (!html) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
