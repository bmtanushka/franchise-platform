import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail, getProviderIdForUser } from "@/lib/db/users";
import type { Role } from "@/lib/db/context";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName ?? user.email,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
        if (user.role === "service_provider") {
          token.providerId = await getProviderIdForUser(user.id as string);
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub ?? "";
      session.user.role = token.role as Role;
      session.user.tenantId = (token.tenantId as string | null | undefined) ?? null;
      session.user.providerId = (token.providerId as string | null | undefined) ?? null;
      return session;
    },
    // AUTH_URL is pinned to one fixed domain (needed so Auth.js doesn't
    // mis-detect the host behind Railway's proxy), but this app is
    // multi-tenant — every tenant's own domain must get its user back after
    // sign-out, not always the AUTH_URL domain. The only caller that ever
    // passes an absolute callbackUrl is our own SignOutButton (built from
    // window.location.origin), so honoring it as-is is safe.
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return url;
    },
  },
});
