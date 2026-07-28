import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Taskora" },
      { name: "description", content: "Aqui verás aprovações, novas tarefas e avisos da tua conta Taskora." },
      { property: "og:title", content: "Notificações — Taskora" },
      { property: "og:description", content: "Aprovações, novas tarefas e avisos da conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Notificações</h1>
      <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <p className="mt-4 font-display text-base font-bold">Nenhuma notificação</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          As novidades da tua conta vão aparecer aqui.
        </p>
      </div>
    </div>
  );
}
