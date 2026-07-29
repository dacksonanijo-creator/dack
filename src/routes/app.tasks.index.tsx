import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock3, Search, Users } from "lucide-react";
import { tasks } from "@/components/taskora/mock-data";
import { stateLabels, useTaskStates, type TaskState } from "@/components/taskora/task-state";
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

const stateTone: Record<TaskState, string> = {
  available: "text-task-accent",
  progress: "text-warning",
  submitted: "text-task-muted",
  approved: "text-task-accent",
  rejected: "text-destructive",
};

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
    <div className="-mx-4 -my-4 min-h-full bg-task-bg px-4 py-4 sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-base font-bold text-task-title">Tarefas</h1>
          <span className="text-[11px] text-task-muted">{list.length} resultados</span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-task-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar tarefa..."
            className="w-full rounded-md border border-task-border bg-task-card py-1.5 pl-8 pr-3 text-[13px] text-task-title outline-none transition-colors placeholder:text-task-muted focus:border-task-accent/60"
          />
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto border-b border-task-border px-4 sm:mx-0 sm:px-0">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 border-b-2 pb-2 text-[12px] font-medium transition-colors",
                filter === f.key
                  ? "border-task-accent text-task-title"
                  : "border-transparent text-task-muted hover:text-task-title",
              )}
            >
              {f.label}
              <span className="ml-1 text-[10px] opacity-60">{count(f.key)}</span>
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-task-border px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-task-title">Nada por aqui</p>
            <p className="mt-1 text-[11px] text-task-muted">
              Não existem tarefas neste estado de momento.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((t) => {
              const state = getState(t.id);
              return (
                <article
                  key={t.id}
                  className="rounded-lg border border-task-border bg-task-card px-3 py-2.5 transition-colors hover:border-task-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] uppercase tracking-wide text-task-muted">
                      {t.category}
                    </span>
                    <span className={cn("shrink-0 text-[10px] font-semibold", stateTone[state])}>
                      {stateLabels[state]}
                    </span>
                  </div>

                  <h2 className="mt-1 truncate font-display text-[13px] font-semibold text-task-title">
                    {t.title}
                  </h2>

                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-task-muted">
                    {t.description}
                  </p>

                  <div className="mt-2 flex items-center gap-3 text-[11px] text-task-muted">
                    <span className="font-semibold text-task-accent">{t.reward}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" /> {t.minutes} min
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <Users className="h-3 w-3" /> {t.slots ?? 0} vagas
                    </span>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Link
                      to="/app/tasks/$taskId"
                      params={{ taskId: t.id }}
                      className="rounded-md border border-task-accent/70 px-2.5 py-1 text-[11px] font-medium text-task-accent transition-colors hover:bg-task-accent/10"
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
    </div>
  );
}
