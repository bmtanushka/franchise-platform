import { ResetPasswordForm } from "./reset-password-form";
import { cardClass } from "@/lib/dashboard-ui";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-background p-6">
      <div className={`${cardClass} w-full max-w-sm space-y-4 p-6`}>
        <h1 className="font-heading text-xl font-bold text-ink">Set a new password</h1>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="font-body rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">
            This reset link is missing its token. Request a new one from the sign-in page.
          </p>
        )}
      </div>
    </main>
  );
}
