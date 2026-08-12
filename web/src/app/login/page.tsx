import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-background p-6">
      <LoginForm resetSuccess={reset === "success"} />
    </main>
  );
}
