import Link from "next/link";
import { Layers } from "lucide-react";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

function initialsOf(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export function TopBar({ name, email, role }: { name: string | null; email: string | null; role: string }) {
  const displayName = name ?? email ?? "";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-forest px-5">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-forest">
          <Layers size={17} strokeWidth={2} />
        </span>
        <span className="font-heading text-sm font-bold tracking-tight text-white">Franchise Platform</span>
      </Link>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-heading text-xs font-semibold text-white">
            {initialsOf(displayName)}
          </span>
          <div className="leading-tight">
            <p className="font-body text-sm text-white">{displayName}</p>
            <p className="font-body text-xs uppercase tracking-wide text-white/55">{role}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
