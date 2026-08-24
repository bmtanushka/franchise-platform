import { sql } from "./client";
import type { SessionContext } from "./context";

// No RLS — chat_settings isn't in the brief's protected set (leads/
// chat_messages/rebates), same app-layer-only pattern as courses/tenants.
const CHAT_SETTINGS_MANAGER_ROLES = new Set(["super_admin", "franchisor"]);

export type ChatSettings = {
  corporateGreeting: string;
  franchiseeGreeting: string;
};

/**
 * Singleton row — always exactly one. The corporate site's chat agent uses
 * corporateGreeting, every franchisee site uses franchiseeGreeting; both
 * are read directly by the Python agent (agent/app/db.py's
 * get_chat_settings), this is only the dashboard's read/write path.
 */
export async function getChatSettings(ctx: SessionContext): Promise<ChatSettings> {
  if (!CHAT_SETTINGS_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Not authorized to view chat settings.");
  }
  const [row] = await sql<{ corporate_greeting: string; franchisee_greeting: string }[]>`
    select corporate_greeting, franchisee_greeting from chat_settings limit 1
  `;
  return { corporateGreeting: row.corporate_greeting, franchiseeGreeting: row.franchisee_greeting };
}

export async function updateChatSettings(ctx: SessionContext, input: ChatSettings): Promise<void> {
  if (!CHAT_SETTINGS_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Only the franchisor can update the chat greeting.");
  }
  await sql`
    update chat_settings
    set corporate_greeting = ${input.corporateGreeting},
        franchisee_greeting = ${input.franchiseeGreeting},
        updated_at = now()
  `;
}
