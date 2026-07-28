import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock3, Wallet } from "lucide-react";
import { tasks } from "@/components/taskora/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/tasks/$taskId")({
  head: () => ({
    meta: [
      { title: "Detalhes da tarefa — Taskora" },
      { name: "description", content: "Instruções, tempo estimado e recompensa da microtarefa selecionada." },
      { property: "og:title", content: "Detalhes da tarefa — Taskora" },
      { property: "og:description", content: "Vê as instruções e inicia a tarefa em segundos." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TaskDetail,
});

function TaskDetail() {
  const { taskId } = useParams({ from: "/app/tasks/$taskId" });
  const task = tasks.find((t) => t.id === taskId) ?? tasks[0];

  return (
    <div className="space-y-6">
      <Link
        to="/app/tasks"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Todas as tarefas
      </Link>

      <div className={`grid h-44 place-items-center rounded-3xl bg-gradient-to-br text-6xl shadow-soft ${task.tint}`}>
        {task.emoji}
      </div>

      <div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {task.category}
        </span>
        <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight">{task.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
          <Clock3 className="h-4.5 w-4.5 text-primary" />
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Tempo</p>
          <p className="font-display text-lg font-bold">{task.minutes} min</p>
        </div>
        <div className="rounded-2xl border border-money/30 bg-accent/60 p-4 shadow-soft">
          <Wallet className="h-4.5 w-4.5 text-money" />
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Recompensa</p>
          <p className="font-display text-lg font-bold text-money">{task.reward}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
        <h2 className="font-display text-base font-bold">Como concluir</h2>
        <ul className="mt-3 space-y-3">
          {task.steps.map((s) => (
            <li key={s} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-money" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sticky bottom-24 md:bottom-6">
        <Button asChild size="lg" className="h-12 w-full rounded-xl text-base shadow-glow">
          <Link to="/app/history">Iniciar tarefa</Link>
        </Button>
      </div>
    </div>
  );
}
