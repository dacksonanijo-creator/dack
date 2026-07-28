import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { notifications } from "@/components/taskora/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Taskora" },
      { name: "description", content: "Acompanha aprovações, novas tarefas e avisos da tua conta Taskora." },
      { property: "og:title", content: "Notificações — Taskora" },
      { property: "og:description", content: "Aprovações, novas tarefas e avisos da conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notifications,
});

const icons = { success: CheckCircle2, info: Info, warning: TriangleAlert };
const tones = {
  success: "bg-accent text-money",
  info: "bg-primary/10 text-primary",
  warning: "bg-warning/20 text-warning-foreground",
};

function Notifications() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {notifications.filter((n) => n.unread).length} não lidas
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((n, i) => {
          const Icon = icons[n.kind];
          return (
            <div
              key={n.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className={cn(
                "animate-rise flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft",
                n.unread ? "border-primary/30" : "border-border/70",
              )}
            >
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tones[n.kind])}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-sm font-bold">{n.title}</p>
                  {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-money" />}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                <p className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{n.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
