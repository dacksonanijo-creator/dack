import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Bell, Clock3, History, ListChecks, Settings, Sparkles, Trophy } from "lucide-react";
import { Avatar } from "@/components/taskora/app-shell";
import { tasks, notifications, user } from "@/components/taskora/mock-data";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Painel — Taskora" },
      { name: "description", content: "O teu painel Taskora: resumo da conta, atalhos e tarefas recomendadas." },
      { property: "og:title", content: "Painel — Taskora" },
      { property: "og:description", content: "Resumo da conta, atalhos rápidos e tarefas recomendadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const shortcuts = [
  { to: "/app/tasks", label: "Tarefas", icon: ListChecks, hint: "18 disponíveis" },
  { to: "/app/history", label: "Histórico", icon: History, hint: "5 registos" },
  { to: "/app/notifications", label: "Notificações", icon: Bell, hint: "2 novas" },
  { to: "/app/settings", label: "Definições", icon: Settings, hint: "Preferências" },
] as const;

function Dashboard() {
  return (
    <div className="space-y-8">
      <section className="animate-rise flex items-center gap-3">
        <Avatar className="h-12 w-12 text-base" />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Bom dia,</p>
          <h1 className="truncate font-display text-2xl font-extrabold">{user.name}</h1>
        </div>
      </section>

      <section className="animate-rise overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow [animation-delay:80ms]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Resumo da conta</p>
            <p className="mt-2 font-display text-3xl font-extrabold">Nível Prata</p>
            <p className="mt-1 text-sm opacity-90">Conta {user.status.toLowerCase()} · {user.country}</p>
          </div>
          <Trophy className="h-8 w-8 opacity-90" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { k: "Tarefas", v: "24" },
            { k: "Aprovadas", v: "21" },
            { k: "Sequência", v: "6 dias" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl bg-white/15 px-2 py-3 backdrop-blur-sm">
              <p className="font-display text-lg font-bold">{s.v}</p>
              <p className="text-[11px] uppercase tracking-wide opacity-80">{s.k}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="animate-rise [animation-delay:140ms]">
        <h2 className="font-display text-lg font-bold">Atalhos</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <s.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-sm font-bold">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="animate-rise [animation-delay:200ms]">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Sparkles className="h-4.5 w-4.5 text-money" /> Recomendadas para ti
          </h2>
          <Link to="/app/tasks" className="text-sm font-semibold text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tasks.slice(0, 4).map((t) => (
            <Link
              key={t.id}
              to="/app/tasks/$taskId"
              params={{ taskId: t.id }}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xl ${t.tint}`}>
                {t.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 block font-display text-sm font-bold">{t.title}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" /> {t.minutes} min · {t.category}
                </span>
              </span>
              <span className="shrink-0 font-display text-sm font-extrabold text-money">{t.reward}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="animate-rise [animation-delay:260ms]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Notificações recentes</h2>
          <Link to="/app/notifications" className="text-sm font-semibold text-primary hover:underline">
            Abrir
          </Link>
        </div>
        <div className="mt-3 divide-y divide-border rounded-2xl border border-border/70 bg-card shadow-soft">
          {notifications.slice(0, 3).map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-4">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-money" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{n.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{n.time}</span>
            </div>
          ))}
        </div>
      </section>

      <Link
        to="/app/tasks"
        className="flex animate-rise items-center justify-between rounded-2xl border border-money/30 bg-accent/60 p-5 [animation-delay:320ms]"
      >
        <div>
          <p className="font-display text-base font-bold">Pronta para a próxima tarefa?</p>
          <p className="text-sm text-muted-foreground">Escolhe uma e conclui em poucos minutos.</p>
        </div>
        <ArrowUpRight className="h-5 w-5 text-money" />
      </Link>
    </div>
  );
}
