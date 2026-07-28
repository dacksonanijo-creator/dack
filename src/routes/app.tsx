import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/taskora/app-shell";
import { TaskStateProvider } from "@/components/taskora/task-state";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <TaskStateProvider>
      <AppShell />
    </TaskStateProvider>
  );
}
