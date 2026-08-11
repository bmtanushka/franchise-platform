import { auth } from "@/lib/auth/config";
import type { SessionContext } from "@/lib/db/context";

/**
 * Builds the SessionContext every tenant/role-scoped data-access function
 * requires, from the current NextAuth session. Throws if unauthenticated —
 * callers (Server Actions, route handlers) are expected to be behind a
 * logged-in-only surface already.
 */
export async function requireSessionContext(): Promise<SessionContext> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated.");
  }

  return {
    role: session.user.role,
    tenantId: session.user.tenantId,
    providerId: session.user.providerId ?? null,
    userId: session.user.id,
  };
}
