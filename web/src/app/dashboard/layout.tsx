import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { TopBar } from "@/components/dashboard/topbar";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { name, email, role } = session.user;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar name={name ?? null} email={email ?? null} role={role} />
      <div className="flex flex-1">
        <Sidebar role={role} />
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </div>
  );
}
