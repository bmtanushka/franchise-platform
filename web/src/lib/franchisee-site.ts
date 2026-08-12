import { readFileSync } from "fs";
import path from "path";
import type { FranchiseeProfile } from "./db/site-content";

// A real, bespoke franchisee site template (raw HTML, same mechanism as
// src/corporate-site — see that file's comment for why raw HTML rather
// than JSX). Unlike the corporate site, this one is shared across every
// franchisee that selects it (site_templates.component_key =
// 'luna-verde-franchisee'), so the brand name and contact details are
// substituted per-tenant at render time instead of being fixed content.
const FRANCHISEE_SITE_DIR = path.join(process.cwd(), "src", "franchisee-site");

const PLACEHOLDER_BRAND = "Luna Verde 5";
const PLACEHOLDER_LOGO = "Luna Verde <em>5</em>";

type PageEntry = { file: string; title: string };

const PAGE_REGISTRY: Record<string, PageEntry> = {
  "/": { file: "index.html", title: "Home" },
  "/credit": { file: "credit.html", title: "Credit" },
  "/business": { file: "business.html", title: "Business Financing" },
  "/commercial-mortgages": { file: "commercial-mortgages.html", title: "Commercial Mortgages" },
  "/foreign-nationals": { file: "foreign-nationals.html", title: "Foreign Nationals & Investors" },
  "/real-estate": { file: "real-estate.html", title: "Real Estate" },
  "/rebate-and-lender-credits": { file: "rebate-and-lender-credits.html", title: "Rebate & Lender Credits" },
  "/about-us": { file: "about-us.html", title: "About Us" },
  "/how-it-works": { file: "how-it-works.html", title: "How It Works" },
  "/partner-with-us": { file: "partner-with-us.html", title: "Partner With Us" },
};

export const FRANCHISEE_SITE_PATHS = new Set(Object.keys(PAGE_REGISTRY));

const fileCache = new Map<string, string>();

function readCached(relativePath: string): string {
  const cached = fileCache.get(relativePath);
  if (cached !== undefined) return cached;

  const content = readFileSync(path.join(FRANCHISEE_SITE_DIR, relativePath), "utf-8");
  fileCache.set(relativePath, content);
  return content;
}

export function normalizeFranchiseeSitePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function applyBrand(html: string, tenantName: string): string {
  const safeName = escapeHtml(tenantName);
  return html.replaceAll(PLACEHOLDER_LOGO, safeName).replaceAll(PLACEHOLDER_BRAND, safeName);
}

function injectContactDetails(footerHtml: string, profile: FranchiseeProfile | null): string {
  if (!profile) return footerHtml;

  const lines = [profile.phone, profile.email, profile.address, profile.businessHours]
    .filter((v): v is string => Boolean(v))
    .map(escapeHtml);

  if (lines.length === 0 && !profile.localBlurb) return footerHtml;

  const contactBlock =
    lines.length > 0
      ? `<div style="margin-top:1rem;display:flex;flex-direction:column;gap:0.3rem;">${lines
          .map((l) => `<p class="f-tagline">${l}</p>`)
          .join("")}</div>`
      : "";

  const blurbBlock = profile.localBlurb
    ? `<p class="f-tagline" style="margin-top:0.8rem;">${escapeHtml(profile.localBlurb)}</p>`
    : "";

  const anchor = `<p class="f-tagline">Capital &amp; Property Solutions</p>`;
  return footerHtml.replace(anchor, `${anchor}\n${contactBlock}\n${blurbBlock}`);
}

export function renderFranchiseeSitePage(
  pathname: string,
  tenant: { name: string },
  profile: FranchiseeProfile | null,
): string | null {
  const entry = PAGE_REGISTRY[normalizeFranchiseeSitePath(pathname)];
  if (!entry) return null;

  let header = readCached("_partials/header.html").replace(
    `PAGE TITLE | ${PLACEHOLDER_BRAND}`,
    `${entry.title} | ${PLACEHOLDER_BRAND}`,
  );
  let content = readCached(entry.file);
  let footer = readCached("_partials/footer.html");

  header = applyBrand(header, tenant.name);
  content = applyBrand(content, tenant.name);
  footer = applyBrand(footer, tenant.name);
  footer = injectContactDetails(footer, profile);

  return header + content + footer;
}
