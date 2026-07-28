import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock3, Search } from "lucide-react";
import { tasks } from "@/components/taskora/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/tasks/")({
  head: () => ({
    meta: [
      { title: "Tarefas disponíveis — Taskora" },
      { name: "description", content: "Explora microtarefas remuneradas por categoria, tempo e recompensa." },
      { property: "og:title", content: "Tarefas disponíveis — Taskora" },
      { property: "og:description", content: "Microtarefas curtas com recompensa clara." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TaskList,
});

function TaskList() {
  const categories = ["Todas", ...Array.from(new Set(tasks.map((t) => t.category)))];
  const [active, setActive] = useState("Todas");
  const list = active === "Todas" ? tasks : tasks.filter((t) => t.category === active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Tarefas</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tasks.length} tarefas disponíveis hoje.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Procurar tarefa..."
          className="w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              active === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((t, i) => (
          <article
            key={t.id}
            className="animate-rise flex flex-col rounded-3xl border border-border/70 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`grid h-24 place-items-center rounded-2xl bg-gradient-to-br text-4xl ${t.tint}`}>
              {t.emoji}
            </div>
            <span className="mt-4 w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {t.category}
            </span>
            <h2 className="mt-2 font-display text-base font-bold leading-snug">{t.title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" /> {t.minutes} min estimados
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="font-display text-lg font-extrabold text-money">{t.reward}</span>
              <Button asChild size="sm" className="rounded-lg">
                <Link to="/app/tasks/$taskId" params={{ taskId: t.id }}>
                  Ver detalhes
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
