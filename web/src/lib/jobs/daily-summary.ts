import { listSummaryRecipients } from "@/lib/db/users";
import { getLeadAnalytics } from "@/lib/db/leads";
import { sendDailySummaryEmail } from "@/lib/email";
import type { SessionContext } from "@/lib/db/context";

/**
 * Sends every login account its own lead-pipeline digest, scoped exactly
 * the way the dashboard already scopes their view — reuses getLeadAnalytics
 * (the same function the Overview page's charts call) rather than a
 * separate ad-hoc query, so a franchisee's numbers here can never drift
 * from what they'd see by logging in.
 */
export async function sendDailySummaries(): Promise<void> {
  const recipients = await listSummaryRecipients();
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

  for (const recipient of recipients) {
    const ctx: SessionContext = {
      role: recipient.role,
      tenantId: recipient.tenantId,
      providerId: recipient.providerId,
      userId: recipient.id,
    };

    try {
      const analytics = await getLeadAnalytics(ctx);
      await sendDailySummaryEmail(recipient.email, {
        recipientName: recipient.fullName ?? recipient.email,
        analytics,
        dashboardUrl,
      });
    } catch (err) {
      console.error(`[daily-summary] Failed to send to ${recipient.email}:`, err);
    }
  }
}
