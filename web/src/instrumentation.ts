// Registers the daily lead-summary email as an in-process cron job rather
// than standing up a separate Railway cron service — this app runs as a
// single long-lived `next start` process (not serverless), so a schedule
// registered once at boot is enough. Assumes a single web instance; if
// this service is ever scaled to multiple replicas, each would fire its
// own 6am job and every recipient would get duplicate emails.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const cron = (await import("node-cron")).default;
  const { sendDailySummaries } = await import("@/lib/jobs/daily-summary");

  // Runs every hour on the hour and checks the actual America/New_York
  // clock inside the job, rather than scheduling a fixed UTC hour — that
  // would drift an hour off "6am" for half the year across the DST change.
  cron.schedule("0 * * * *", async () => {
    const hourInEastern = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).format(new Date());

    if (hourInEastern !== "06") return;

    try {
      await sendDailySummaries();
    } catch (err) {
      console.error("[daily-summary] Job failed:", err);
    }
  });
}
