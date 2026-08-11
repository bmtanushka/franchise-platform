import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

export function TopBar({ name, email, role }: { name: string | null; email: string | null; role: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 px-5 dark:border-white/15">
      <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
        Franchise Platform
      </Link>
      <div className="flex items-center gap-4">
        <p className="text-sm opacity-70">
          {name ?? email} — <span className="font-mono text-xs">{role}</span>
        </p>
        <SignOutButton />
      </div>
    </header>
  );
}
