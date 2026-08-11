import { readFileSync } from "fs";
import path from "path";

// The franchisor's real marketing site (Luna Verde Corporate) — supplied as
// standalone HTML files, each meant to be assembled as
// header partial + page content + footer partial (see
// src/corporate-site/_partials and the site's own template.html /
// new-page.md convention). Served as raw HTML via a proxy rewrite
// (see src/proxy.ts + src/app/corp/[[...slug]]/route.ts) rather than
// ported to JSX, so the bespoke animations/sliders/nav behavior in the
// partials' inline <script> tags keep working unmodified — React strips
// <script> tags injected via dangerouslySetInnerHTML, a raw HTML response
// does not.
const CORPORATE_DIR = path.join(process.cwd(), "src", "corporate-site");

type PageEntry = { file: string; title: string };

const PAGE_REGISTRY: Record<string, PageEntry> = {
  "/": { file: "index.html", title: "Home" },
  "/credit": { file: "credit.html", title: "Credit" },
  "/business": { file: "business.html", title: "Business Financing & Lines of Credit" },
  "/commercial-mortgages": { file: "commercial-mortgages.html", title: "Commercial Mortgages" },
  "/foreign-nationals": { file: "foreign-nationals.html", title: "Foreign Nationals & Investors" },
  "/real-estate": { file: "real-estate.html", title: "Real Estate" },
  "/rebate-and-credit-rewards": { file: "rebate-and-credit-rewards.html", title: "Rebate & Lender Credits" },
  "/about-us": { file: "about-us.html", title: "About Us" },
  "/how-it-works": { file: "how-it-works.html", title: "How It Works" },
  "/partner-with-us": { file: "partner-with-us.html", title: "Partner With Us" },
  "/franchise-opportunities": { file: "franchise-opportunities.html", title: "Franchise Opportunities" },
  "/franchise-opportunities/training-and-support": {
    file: "franchise-opportunities/training-and-support/index.html",
    title: "Training & Support",
  },
  "/franchise-opportunities/investment": {
    file: "franchise-opportunities/investment/index.html",
    title: "Investment",
  },
};

export const CORPORATE_PATHS = new Set(Object.keys(PAGE_REGISTRY));

const fileCache = new Map<string, string>();

function readCached(relativePath: string): string {
  const cached = fileCache.get(relativePath);
  if (cached !== undefined) return cached;

  const content = readFileSync(path.join(CORPORATE_DIR, relativePath), "utf-8");
  fileCache.set(relativePath, content);
  return content;
}

export function normalizeCorporatePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function renderCorporatePage(pathname: string): string | null {
  const entry = PAGE_REGISTRY[normalizeCorporatePath(pathname)];
  if (!entry) return null;

  const header = readCached("_partials/header.html").replace(
    "PAGE TITLE | Luna Verde Corporate",
    `${entry.title} | Luna Verde Corporate`,
  );
  const content = readCached(entry.file);
  const footer = readCached("_partials/footer.html");

  return header + content + footer;
}
