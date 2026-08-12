"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cardClass, inputClass, labelClass, primaryButtonClass, linkClass } from "@/lib/dashboard-ui";

export function LoginForm({ resetSuccess }: { resetSuccess: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    setSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} w-full max-w-sm space-y-4 p-6`}>
      <h1 className="font-heading text-xl font-bold text-ink">Sign in</h1>
      <p className="font-body -mt-3 text-sm text-slate">Franchise Platform</p>

      {resetSuccess && (
        <p className="font-body rounded-md bg-success-bg px-3 py-2 text-sm text-success-text">
          Password updated. Sign in with your new password.
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <Link href="/forgot-password" className={`${linkClass} mb-1 text-xs`}>
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">{error}</p>
      )}

      <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
        {submitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
