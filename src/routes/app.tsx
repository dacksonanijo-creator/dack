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

    // Admin accounts can authenticate with the same Google/email identity,
    // but should land directly in the administrative area after OAuth.
    if (isAdminEmail(data.user.email)) throw redirect({ to: "/admin" });

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
