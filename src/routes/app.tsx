import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/taskora/app-shell";
import { TaskStateProvider } from "@/components/taskora/task-state";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });

    // Admin accounts may also use the app as a regular user.
    if (isAdminEmail(data.user.email)) return { user: data.user };


    const { data: profile } = await (supabase as any).from("profiles").select("account_type").eq("id", data.user.id).maybeSingle();
    if (profile?.account_type === "client") throw redirect({ to: "/client" });

    return { user: data.user };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <TaskStateProvider>
      <AppShell />
    </TaskStateProvider>
  );
}
