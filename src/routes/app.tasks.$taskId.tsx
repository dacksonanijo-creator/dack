import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, ExternalLink, Globe2, ShieldCheck, Wallet } from "lucide-react";
import { tasks, taskRules } from "@/components/taskora/mock-data";
import { stateClasses, useStateLabels, useTaskStates } from "@/components/taskora/task-state";
import { listExternalTasks } from "@/lib/tasks/tasks.functions";
import type { UnifiedTask } from "@/lib/tasks/types";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/tasks/$taskId")({
  head: () => ({
    meta: [
      { title: "Detalhes da tarefa — Taskora" },
      { name: "description", content: "Instruções, regras, prazo e recompensa da microtarefa selecionada." },
      { property: "og:title", content: "Detalhes da tarefa — Taskora" },
      { property: "og:description", content: "Vê as instruções e inicia a tarefa em segundos." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TaskDetailRoute,
});

function BackLink() {
  const t = useT();
  return (
    <Link
      to="/app/tasks"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> {t("tasks.back")}
    </Link>
  );
}

function TaskDetailRoute() {
  const t = useT();
  const { taskId } = useParams({ from: "/app/tasks/$taskId" });
  const fetchTasks = useServerFn(listExternalTasks);
  const { data: data, isPending } = useQuery({
    queryKey: ["external-tasks"],
    queryFn: () => fetchTasks({ data: {} }),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: taskoraData } = useQuery({
    queryKey: ["taskora-task", taskId],
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any).rpc("get_available_taskora_tasks");
      if (error) throw error;
      return (Array.isArray(rows) ? rows : []).find((row: any) => row.id === taskId) ?? null;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const external = data?.tasks.find((task) => task.id === taskId);
  if (taskoraData) return <TaskoraTaskDetail task={taskoraData} />;
  if (external) return <ExternalTaskDetail task={external} />;

  const mock = tasks.find((task) => task.id === taskId);
  if (mock) return <MockTaskDetail taskId={mock.id} />;

  if (isPending) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="h-40 animate-pulse rounded-xl border border-border/70 bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />
      <div className="rounded-xl border border-dashed border-border/70 bg-card p-6 text-center text-xs text-muted-foreground">
        {t("tasks.emptyState.title")}
      </div>
    </div>
  );
}

function TaskoraTaskDetail({ task }: { task: any }) {
  const [proof, setProof] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    setSubmitting(true); setMessage("");
    const { error } = await (supabase as any).rpc("submit_task_for_verification", {
      p_task_id: task.id,
      p_proof: proof.trim() || null,
      p_evidence: {},
    });
    setSubmitting(false);
    setMessage(error ? error.message : "Conclusão submetida. A recompensa está reservada e aguarda verificação.");
  };

  return (
    <div className="space-y-4">
      <BackLink />
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">{task.category}</span>
        <h1 className="mt-2 font-display text-base font-extrabold">{task.title}</h1>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          <div><p className="text-[10px] uppercase text-muted-foreground">Recompensa</p><p className="font-display text-sm font-bold text-money">{Number(task.reward).toFixed(2)} {task.currency}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Vagas</p><p className="font-display text-sm font-bold">{Math.max(0, task.slots-task.slots_filled)}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Verificação</p><p className="font-display text-sm font-bold">{task.verification_method}</p></div>
        </div>
      </div>
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <h2 className="font-display text-sm font-bold">Submeter conclusão</h2>
        <p className="mt-1 text-xs text-muted-foreground">A recompensa não fica disponível imediatamente. Primeiro é criada uma reserva financeira e a conclusão passa pelo Motor de Verificação TASKORA.</p>
        <textarea value={proof} onChange={(e)=>setProof(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary" placeholder="Evidência ou código, quando a tarefa exigir." />
        {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
        <button type="button" disabled={submitting} onClick={() => void submit()} className="mt-3 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          {submitting ? "A submeter…" : "Submeter para verificação"}
        </button>
      </div>
    </div>
  );
}

function ExternalTaskDetail({ task }: { task: UnifiedTask }) {
  const t = useT();
  const stateLabels = useStateLabels();
  const { getState, setState } = useTaskStates();
  const state = getState(task.id);

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="rounded-xl border border-border/70 bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10">
            {task.imageUrl ? (
              <img src={task.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="text-xs font-bold text-primary">{task.title.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {task.category && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {task.category}
                </span>
              )}
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", stateClasses[state])}>
                {stateLabels[state]}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {t("tasks.provider")}: {task.providerLabel}
              </span>
            </div>
            <h1 className="mt-1.5 font-display text-base font-extrabold leading-snug">{task.title}</h1>
          </div>
        </div>

        {task.description && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          <div>
            <Wallet className="mx-auto h-3.5 w-3.5 text-money" />
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t("tasks.reward")}</p>
            <p className="font-display text-sm font-bold text-money">
              {typeof task.reward === "number" ? `${task.reward.toFixed(2)} ${task.currency ?? ""}`.trim() : "—"}
            </p>
          </div>
          <div>
            <Clock3 className="mx-auto h-3.5 w-3.5 text-primary" />
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t("tasks.time")}</p>
            <p className="font-display text-sm font-bold">
              {typeof task.estimatedMinutes === "number" ? `${task.estimatedMinutes} ${t("tasks.minutes")}` : "—"}
            </p>
          </div>
          <div>
            <CalendarClock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t("tasks.deadline")}</p>
            <p className="font-display text-sm font-bold">{task.deadline ?? t("tasks.noDeadline")}</p>
          </div>
        </div>

        {task.countries && task.countries.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" /> {t("tasks.countries")}: {task.countries.join(", ")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">{t("tasks.status.followInstructions")}</p>
        {task.actionUrl && (
          <a
            href={task.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setState(task.id, "progress")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t("tasks.openTask")}
          </a>
        )}
      </div>
    </div>
  );
}

function MockTaskDetail({ taskId }: { taskId: string }) {
  const t = useT();
  const stateLabels = useStateLabels();
  const task = tasks.find((item) => item.id === taskId)!;
  const { getState, setState } = useTaskStates();
  const state = getState(task.id);

  const action =
    state === "available"
      ? { label: t("tasks.action.start"), next: "progress" as const }
      : state === "progress"
        ? { label: t("tasks.action.submit"), next: "submitted" as const }
        : null;

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="rounded-xl border border-border/70 bg-card p-4">
        <div className="flex items-start gap-3">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-xl", task.tint)}>
            {task.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t(task.categoryKey)}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", stateClasses[state])}>
                {stateLabels[state]}
              </span>
            </div>
            <h1 className="mt-1.5 font-display text-base font-extrabold leading-snug">{t(task.titleKey)}</h1>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(task.descriptionKey)}</p>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          <div>
            <Wallet className="mx-auto h-3.5 w-3.5 text-money" />
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t("tasks.reward")}</p>
            <p className="font-display text-sm font-bold text-money">{task.reward}</p>
          </div>
          <div>
            <Clock3 className="mx-auto h-3.5 w-3.5 text-primary" />
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t("tasks.time")}</p>
            <p className="font-display text-sm font-bold">{task.minutes} {t("tasks.minutes")}</p>
          </div>
          <div>
            <CalendarClock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t("tasks.deadline")}</p>
            <p className="font-display text-sm font-bold">{task.deadline ?? t("tasks.noDeadline")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-4">
        <h2 className="font-display text-sm font-bold">{t("tasks.instructions")}</h2>
        <ol className="mt-2 space-y-2">
          {task.stepKeys.map((s, i) => (
            <li key={s} className="flex items-start gap-2 text-xs leading-relaxed">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <span>{t(s)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-4">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> {t("tasks.completionRules")}
        </h2>
        <ul className="mt-2 space-y-1.5">
          {(task.ruleKeys ?? taskRules).map((r) => (
            <li key={r} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-money" />
              <span>{t(r)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {state === "submitted"
            ? t("tasks.status.underReview")
            : state === "approved"
              ? t("tasks.status.approvedDone")
              : state === "rejected"
                ? t("tasks.status.rejectedSubmission")
                : t("tasks.status.followInstructions")}
        </p>
        {action && (
          <button
            onClick={() => setState(task.id, action.next)}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
