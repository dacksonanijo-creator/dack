import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BellOff } from "lucide-react";

export const Route = createFileRoute("/client/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Taskora" },
      { name: "description", content: "Alertas e avisos da tua conta de empresa na Taskora." },
      { property: "og:title", content: "Notificações — Taskora" },
      { property: "og:description", content: "Alertas e avisos da tua conta de empresa na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientNotificationsPage,
});

function ClientNotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/client" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao resumo</Link>
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BellOff className="h-5 w-5" /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA · PAINEL EMPRESARIAL</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Notificações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Alertas e avisos da tua conta de empresa.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><BellOff className="h-6 w-6" /></span>
        <h2 className="mt-4 font-semibold">Ainda não tens notificações</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">O módulo de notificações da conta empresarial ainda não está activo. Quando estiver, os alertas sobre tarefas, verificações e resultados aparecerão aqui.</p>
      </section>

      <p className="text-xs leading-5 text-muted-foreground">Enquanto isso, acompanha o estado das tarefas em <Link to="/client/tasks" className="font-medium text-primary underline">Minhas tarefas</Link> e as alterações no histórico de cada tarefa.</p>
    </div>
  );
}
