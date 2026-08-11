import Link from "next/link";
import type { Tenant } from "@/lib/db/tenants";
import type { SiteContentMap, FranchiseeProfile } from "@/lib/db/site-content";
import { ChatWidget } from "@/components/chat/chat-widget";

type HeroContent = { headline: string; subheadline: string };
type ServicesIntroContent = { heading: string; services: { key: string; label: string }[] };

export function StandardTemplate({
  tenant,
  siteContent,
  franchiseeProfile,
}: {
  tenant: Tenant;
  siteContent: SiteContentMap;
  franchiseeProfile: FranchiseeProfile | null;
}) {
  const hero = siteContent.hero as HeroContent | undefined;
  const servicesIntro = siteContent.services_intro as ServicesIntroContent | undefined;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/15">
        <span className="font-semibold">{tenant.name}</span>
        <Link href="/login" className="text-sm opacity-70 hover:opacity-100">
          Sign in
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            {hero?.headline ?? "Financing made simple."}
          </h1>
          <p className="mt-4 text-lg opacity-70 text-balance">
            {hero?.subheadline ?? ""}
          </p>
          <p className="mt-8 text-sm opacity-60">
            {tenant.type === "franchisee"
              ? `Serving your area — ${tenant.name}`
              : "Find your local office or chat with us to get started."}
          </p>
        </section>

        {servicesIntro && (
          <section className="mx-auto max-w-3xl px-6 pb-20">
            <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-wide opacity-60">
              {servicesIntro.heading}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {servicesIntro.services.map((service) => (
                <li
                  key={service.key}
                  className="rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/15"
                >
                  {service.label}
                </li>
              ))}
            </ul>
          </section>
        )}

        {tenant.type === "franchisee" && franchiseeProfile && (
          <section className="mx-auto max-w-3xl px-6 pb-20">
            <h2 className="mb-4 text-center text-sm font-medium uppercase tracking-wide opacity-60">
              Contact this office
            </h2>
            <dl className="mx-auto grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
              {franchiseeProfile.phone && (
                <>
                  <dt className="opacity-60">Phone</dt>
                  <dd>{franchiseeProfile.phone}</dd>
                </>
              )}
              {franchiseeProfile.email && (
                <>
                  <dt className="opacity-60">Email</dt>
                  <dd>{franchiseeProfile.email}</dd>
                </>
              )}
              {franchiseeProfile.address && (
                <>
                  <dt className="opacity-60">Address</dt>
                  <dd>{franchiseeProfile.address}</dd>
                </>
              )}
              {franchiseeProfile.businessHours && (
                <>
                  <dt className="opacity-60">Hours</dt>
                  <dd>{franchiseeProfile.businessHours}</dd>
                </>
              )}
            </dl>
            {franchiseeProfile.localBlurb && (
              <p className="mx-auto mt-4 max-w-md text-center text-sm opacity-70">
                {franchiseeProfile.localBlurb}
              </p>
            )}
          </section>
        )}
      </main>

      <ChatWidget />
    </div>
  );
}
