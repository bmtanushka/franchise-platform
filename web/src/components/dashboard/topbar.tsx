import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

export function TopBar({ name, email, role }: { name: string | null; email: string | null; role: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-forest px-5">
      <Link href="/dashboard" className="font-heading text-sm font-bold tracking-tight text-white">
        Franchise Platform
      </Link>
      <div className="flex items-center gap-4">
        <p className="font-body text-sm text-white/80">
          {name ?? email} — <span className="text-xs uppercase tracking-wide text-white/60">{role}</span>
        </p>
        <SignOutButton />
      </div>
    </header>
  );
}
