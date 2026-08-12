import crypto from "crypto";
import { sql } from "./client";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Generates a reset token, stores only its hash, and returns the raw token to email out. */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await sql`
    insert into password_reset_tokens (user_id, token_hash, expires_at)
    values (${userId}, ${tokenHash}, ${expiresAt})
  `;

  return token;
}

/**
 * Atomically marks a token used and returns the user it belongs to, or null
 * if it doesn't exist / already used / expired. The update-with-returning
 * form makes this single-use even under a race (e.g. the link double-clicked
 * or opened in two tabs).
 */
export async function consumeResetToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);

  const rows = await sql<{ user_id: string }[]>`
    update password_reset_tokens
    set used_at = now()
    where token_hash = ${tokenHash}
      and used_at is null
      and expires_at > now()
    returning user_id
  `;

  return rows.length > 0 ? rows[0].user_id : null;
}
