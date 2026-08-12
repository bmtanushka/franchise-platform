import { Resend } from "resend";

// Same "gracefully no-op instead of crash when the key isn't set" pattern
// as the chat agent's OPENAI_API_KEY fallback — lets local dev and any
// environment without RESEND_API_KEY configured keep working (the reset
// link just lands in the server log instead of an inbox).
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — password reset link for ${to}: ${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your Franchise Platform password",
    html: `
      <p>Someone requested a password reset for your Franchise Platform account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a> — this link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
