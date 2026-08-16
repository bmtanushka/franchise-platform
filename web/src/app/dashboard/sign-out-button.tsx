"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
      className="font-body rounded-md border border-white/25 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
