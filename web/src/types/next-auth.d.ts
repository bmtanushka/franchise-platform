import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/db/context";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      tenantId: string | null;
      providerId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    tenantId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    tenantId?: string | null;
    providerId?: string | null;
  }
}
