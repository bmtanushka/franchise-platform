import { Resend } from "resend";
import { STATUS_LABEL } from "@/lib/lead-status-labels";
import type { LeadStatus, LeadAnalytics } from "@/lib/db/leads";

// Same "gracefully no-op instead of crash when the key isn't set" pattern
// as the chat agent's OPENAI_API_KEY fallback — lets local dev and any
// environment without RESEND_API_KEY configured keep working (the email
// just lands in the server log instead of an inbox).
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — would send "${subject}" to ${to}`);
    return;
  }
  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await send(
    to,
    "Reset your Franchise Platform password",
    `
      <p>Someone requested a password reset for your Franchise Platform account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a> — this link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  );
}

export async function sendLeadAssignedEmail(
  to: string,
  opts: {
    companyName: string;
    leadContactName: string | null;
    serviceTypeLabel: string;
    tenantName: string;
    leadUrl: string;
  },
): Promise<void> {
  await send(
    to,
    `New lead assigned: ${opts.leadContactName ?? opts.serviceTypeLabel}`,
    `
      <p>A lead has been assigned to ${opts.companyName}:</p>
      <ul>
        <li>Contact: ${opts.leadContactName ?? "—"}</li>
        <li>Service: ${opts.serviceTypeLabel}</li>
        <li>Franchisee: ${opts.tenantName}</li>
      </ul>
      <p><a href="${opts.leadUrl}">View this lead</a></p>
    `,
  );
}

export async function sendLeadCreatedEmail(
  to: string,
  opts: { tenantName: string; leadContactName: string | null; serviceTypeLabel: string; leadUrl: string },
): Promise<void> {
  await send(
    to,
    `New lead for ${opts.tenantName}`,
    `
      <p>A new lead came in for <strong>${opts.tenantName}</strong>:</p>
      <ul>
        <li>Contact: ${opts.leadContactName ?? "—"}</li>
        <li>Service: ${opts.serviceTypeLabel}</li>
      </ul>
      <p><a href="${opts.leadUrl}">View this lead</a></p>
    `,
  );
}

// Pipeline order, not alphabetical — matches STATUS_LABEL's key order,
// which is itself the same order the kanban board and status filter use.
const SUMMARY_STATUS_ORDER = Object.keys(STATUS_LABEL) as LeadStatus[];

export async function sendDailySummaryEmail(
  to: string,
  opts: { recipientName: string; analytics: LeadAnalytics; dashboardUrl: string },
): Promise<void> {
  const counts = new Map(opts.analytics.byStatus.map((s) => [s.status, s.count]));
  const rows = SUMMARY_STATUS_ORDER.map(
    (status) => `<tr><td style="padding:2px 12px 2px 0;">${STATUS_LABEL[status]}</td><td>${counts.get(status) ?? 0}</td></tr>`,
  ).join("");

  await send(
    to,
    `Daily lead summary — ${opts.analytics.totalLeads} total leads`,
    `
      <p>Good morning, ${opts.recipientName}. Here's yesterday's lead pipeline:</p>
      <table>${rows}</table>
      <p><strong>Total: ${opts.analytics.totalLeads}</strong></p>
      <p><a href="${opts.dashboardUrl}">Open the dashboard</a></p>
    `,
  );
}
