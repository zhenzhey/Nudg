import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { ActiveProjectProvider } from "@/components/layout/active-project-context";
import { AIModeProvider } from "@/components/layout/ai-mode-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AIModeProvider>
      <ActiveProjectProvider>
        <div className="min-h-screen bg-background">
          <Navbar userEmail={user.email} />
          <main>{children}</main>
        </div>
      </ActiveProjectProvider>
    </AIModeProvider>
  );
}
