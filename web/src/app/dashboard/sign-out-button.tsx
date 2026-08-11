"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
    >
      Sign out
    </button>
  );
}
