import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/taskora/app-shell";
import { TaskStateProvider } from "@/components/taskora/task-state";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
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
