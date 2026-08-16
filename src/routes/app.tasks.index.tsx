import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Clock3, RefreshCw, Search, SearchX, WifiOff } from "lucide-react";
import { listExternalTasks } from "@/lib/tasks/tasks.functions";
import type { UnifiedTask } from "@/lib/tasks/types";
import { useStateLabels, useTaskStates, type TaskState } from "@/components/taskora/task-state";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/tasks/")({
  head: () => ({
    meta: [
      { title: "Tarefas — Taskora" },
      { name: "description", content: "Consulta tarefas disponíveis, em andamento e concluídas na Taskora." },
      { property: "og:title", content: "Tarefas — Taskora" },
      { property: "og:description", content: "Microtarefas curtas com recompensa clara." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TaskList,
});

type FilterKey = "all" | "available" | "progress" | "done";

function matches(state: TaskState, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "done") return state === "approved" || state === "rejected" || state === "submitted";
  return state === filter;
}

const stateTone: Record<TaskState, string> = {
  available: "text-task-accent",
  progress: "text-warning",
  submitted: "text-task-muted",
  approved: "text-task-accent",
  rejected: "text-destructive",
};

function formatReward(task: UnifiedTask) {
  if (typeof task.reward !== "number") return null;
  return `${task.reward.toFixed(2)} ${task.currency ?? ""}`.trim();
}

function TaskList() {
  const t = useT();
  const router = useRouter();
  const stateLabels = useStateLabels();
  const { getState } = useTaskStates();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchTasks = useServerFn(listExternalTasks);
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["external-tasks"],
    queryFn: () => fetchTasks({ data: {} }),
    staleTime: 60_000,
    retry: 1,
  });

  const feedTasks = useMemo(() => data?.tasks ?? [], [data]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(feedTasks.map((task) => task.category).filter(Boolean) as string[]))],
    [feedTasks],
  );

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("tasks.filter.all") },
    { key: "available", label: t("tasks.filter.available") },
    { key: "progress", label: t("tasks.filter.progress") },
    { key: "done", label: t("tasks.filter.done") },
  ];

  const list = feedTasks.filter(
    (task) =>
      matches(getState(task.id), filter) &&
      (category === "all" || task.category === category) &&
      task.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const loading = isPending || (isFetching && feedTasks.length === 0);
  const showEmpty = !loading && !isError && list.length === 0;

  return (
    <div className="-mx-4 -my-4 min-h-full bg-task-bg px-4 py-4 sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-3">
        {/* Header */}
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          {router.history.canGoBack() ? (
            <button
              type="button"
              onClick={() => router.history.back()}
              aria-label={t("withdraw.back")}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-task-border text-task-muted transition-colors hover:text-task-title"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <span className="h-8 w-8" />
          )}
          <h1 className="truncate text-center font-display text-base font-bold text-task-title">
            {t("tasks.title")}
          </h1>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={t("tasks.search.open")}
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors",
              searchOpen
                ? "border-task-accent/60 bg-task-accent/10 text-task-accent"
                : "border-task-border text-task-muted hover:text-task-title",
            )}
          >
            <Search className="h-4 w-4" />
          </button>
        </header>

        {/* Search */}
        {searchOpen && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-task-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("tasks.search.placeholderLong")}
              className="w-full rounded-full border border-task-border bg-task-card py-2 pl-9 pr-4 text-[13px] text-task-title outline-none transition-colors placeholder:text-task-muted focus:border-task-accent/60"
            />
          </div>
        )}

        {/* Status chips */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-task-border bg-task-card text-task-muted hover:text-task-title",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="-mx-4 flex gap-3 overflow-x-auto border-b border-task-border px-4 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 border-b-2 pb-2 text-[12px] transition-colors",
                category === c
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-task-muted hover:text-task-title",
              )}
            >
              {c === "all" ? t("tasks.category.all") : c}
            </button>
          ))}
        </div>

        {/* Content states */}
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-task-border bg-task-card p-3">
                <div className="flex gap-3">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-task-border" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-task-border" />
                    <div className="h-2.5 w-full animate-pulse rounded bg-task-border/70" />
                    <div className="h-2.5 w-2/3 animate-pulse rounded bg-task-border/70" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-3 w-14 animate-pulse rounded bg-task-border" />
                  <div className="h-3 w-12 animate-pulse rounded bg-task-border/70" />
                  <div className="ml-auto h-6 w-20 animate-pulse rounded-full bg-task-border/70" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-task-border px-6 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
              <WifiOff className="h-6 w-6" />
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-snug text-task-title">{t("tasks.error.title")}</p>
            <button
              onClick={() => void refetch()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t("tasks.retry")}
            </button>
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-task-border px-6 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <SearchX className="h-6 w-6" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-task-title">{t("tasks.emptyState.title")}</p>
            <button
              onClick={() => void refetch()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t("tasks.refresh")}
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((task) => {
              const state = getState(task.id);
              const reward = formatReward(task);
              return (
                <article
                  key={task.id}
                  className="rounded-xl border border-task-border bg-task-card p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-lg">
                      {task.imageUrl ? (
                        <img src={task.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-[11px] font-bold text-primary">
                          {task.title.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] uppercase tracking-wide text-task-muted">
                          {task.category ?? task.providerLabel}
                        </span>
                        <span className={cn("shrink-0 text-[10px] font-semibold", stateTone[state])}>
                          {stateLabels[state]}
                        </span>
                      </div>
                      <h2 className="mt-0.5 truncate font-display text-[13px] font-semibold text-task-title">
                        {task.title}
                      </h2>
                      {task.description && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-task-muted">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-task-muted">
                    {reward && <span className="font-semibold text-task-accent">{reward}</span>}
                    {typeof task.estimatedMinutes === "number" && (
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" /> {task.estimatedMinutes} {t("tasks.minutes")}
                      </span>
                    )}
                    <Link
                      to="/app/tasks/$taskId"
                      params={{ taskId: task.id }}
                      className="ml-auto rounded-full border border-primary px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      {t("tasks.viewDetails")}
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
