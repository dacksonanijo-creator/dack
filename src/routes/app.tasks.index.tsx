import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock3, Search } from "lucide-react";
import { tasks } from "@/components/taskora/mock-data";
import {
  stateClasses,
  stateLabels,
  useTaskStates,
  type TaskState,
} from "@/components/taskora/task-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/tasks/")({
  head: () => ({
    meta: [
      { title: "Tarefas — Taskora" },
      { name: "description", content: "Consulta tarefas disponíveis, em andamento, enviadas e concluídas." },
      { property: "og:title", content: "Tarefas — Taskora" },
      { property: "og:description", content: "Microtarefas curtas com recompensa clara." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TaskList,
});

const filters = [
  { key: "available", label: "Disponíveis" },
  { key: "progress", label: "Em andamento" },
  { key: "submitted", label: "Enviadas" },
  { key: "done", label: "Concluídas" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

function matches(state: TaskState, filter: FilterKey) {
  if (filter === "done") return state === "approved" || state === "rejected";
  return state === filter;
}

function TaskList() {
  const { getState } = useTaskStates();
  const [filter, setFilter] = useState<FilterKey>("available");
  const [query, setQuery] = useState("");

  const list = tasks.filter(
    (t) =>
      matches(getState(t.id), filter) &&
      t.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const count = (key: FilterKey) => tasks.filter((t) => matches(getState(t.id), key)).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">Tarefas</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count("available")} disponíveis · {count("progress")} em andamento
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar tarefa..."
          className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span className="ml-1 opacity-70">{count(f.key)}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-10 text-center">
          <p className="text-sm font-semibold">Nada por aqui</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Não existem tarefas neste estado de momento.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {list.map((t) => {
            const state = getState(t.id);
            return (
              <article
                key={t.id}
                className="rounded-xl border border-border/70 bg-card p-3.5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start gap-2.5">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-lg", t.tint)}>
                    {t.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate font-display text-sm font-bold leading-snug">{t.title}</h2>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          stateClasses[state],
                        )}
                      >
                        {stateLabels[state]}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="font-display font-bold text-money">{t.reward}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock3 className="h-3 w-3" /> {t.minutes} min
                    </span>
                  </div>
                  <Link
                    to="/app/tasks/$taskId"
                    params={{ taskId: t.id }}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Ver tarefa
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
