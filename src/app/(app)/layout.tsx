import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={session.user.role} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
