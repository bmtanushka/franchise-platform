"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemsForRole } from "@/lib/dashboard-nav";
import type { Role } from "@/lib/db/context";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 bg-forest p-3">
      {items.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`font-body flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              active ? "bg-moss font-medium text-white" : "text-white/70 hover:bg-moss/25 hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={active ? 2.25 : 1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
