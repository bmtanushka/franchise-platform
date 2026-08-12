import { ForgotPasswordForm } from "./forgot-password-form";
import { cardClass } from "@/lib/dashboard-ui";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background p-6">
      <div className={`${cardClass} w-full max-w-sm space-y-4 p-6`}>
        <h1 className="font-heading text-xl font-bold text-ink">Reset your password</h1>
        <p className="font-body -mt-3 text-sm text-slate">
          Enter your account email and we&apos;ll send you a link to set a new password.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
