import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowLeft, ChartNoAxesColumn, CheckCircle2, ClipboardList,
  Clock3, FilePlus2, LoaderCircle, RefreshCw, ShieldAlert, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type TaskRow = {
  id: string; title: string; status: string; is_draft: boolean | null;
  created_at: string; category: string | null;
};
type SubmissionRow = { task_id: string; status: string; created_at: string };

export const Route = createFileRoute("/client/stats")({
  head: () => ({
    meta: [
      { title: "Estatísticas — Taskora" },
      { name: "description", content: "Indicadores reais das tarefas e participações da tua conta de empresa." },
      { property: "og:title", content: "Estatísticas — Taskora" },
      { property: "og:description", content: "Indicadores reais das tarefas e participações da tua conta de empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientStatsPage,
});

const taskStatusLabels: Record<string, string> = {
  active: "Ativa", paused: "Pausada", completed: "Concluída",
};
const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(date);
};

function ClientStatsPage() {
  const { userId } = Route.useRouteContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [submissionsAvailable, setSubmissionsAvailable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: companies, error: companiesError } = await db.from("companies")
        .select("id").eq("owner_id", userId);
      if (companiesError) throw companiesError;
      const ids = (companies ?? []).map((item: { id: string }) => item.id as string);
      if (ids.length === 0) {
        setTasks([]); setSubmissions([]); setSubmissionsAvailable(true); setLastUpdated(new Date().toISOString());
        setLoading(false);
        return;
      }

      const { data: taskRows, error: taskError } = await db.from("tasks")
        .select("id,title,status,is_draft,created_at,category")
        .in("company_id", ids)
        .order("created_at", { ascending: false });
      if (taskError) throw taskError;
      const ownTasks = (taskRows ?? []) as TaskRow[];
      setTasks(ownTasks);

      const taskIds = ownTasks.map((task) => task.id);
      if (taskIds.length === 0) {
        setSubmissions([]); setSubmissionsAvailable(true); setLastUpdated(new Date().toISOString());
        setLoading(false);
        return;
      }
      const { data: submissionRows, error: submissionError } = await db.from("task_submissions")
        .select("task_id,status,created_at").in("task_id", taskIds);
      if (submissionError) {
        setSubmissions([]); setSubmissionsAvailable(false);
      } else {
        setSubmissions((submissionRows ?? []) as SubmissionRow[]);
        setSubmissionsAvailable(true);
      }
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error("Taskora client stats load failed", err);
      setError("Não foi possível carregar as estatísticas. Verifica a ligação e tenta novamente.");
      setTasks([]); setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const published = tasks.filter((task) => !task.is_draft);
  const byStatus = (status: string) => published.filter((task) => task.status === status).length;
  const draftCount = tasks.filter((task) => task.is_draft).length;
  const submissionCount = (status: string | null) =>
    status === null ? submissions.length : submissions.filter((item) => item.status === status).length;

  const taskCards = [
    { label: "Tarefas publicadas", value: published.length, icon: ClipboardList },
    { label: "Ativas", value: byStatus("active"), icon: Activity },
    { label: "Pausadas", value: byStatus("paused"), icon: Clock3 },
    { label: "Concluídas", value: byStatus("completed"), icon: CheckCircle2 },
    { label: "Rascunhos", value: draftCount, icon: FilePlus2 },
  ];
  const submissionCards = submissionsAvailable ? [
    { label: "Participações", value: submissions.length },
    { label: "Pendentes", value: submissionCount("pending") },
    { label: "Aprovadas", value: submissionCount("approved") },
    { label: "Rejeitadas", value: submissionCount("rejected") },
  ] : [];

  const countsByTask = new Map<string, { participations: number; approved: number }>();
  for (const item of submissions) {
    const entry = countsByTask.get(item.task_id) ?? { participations: 0, approved: 0 };
    entry.participations += 1;
    if (item.status === "approved") entry.approved += 1;
    countsByTask.set(item.task_id, entry);
  }

  return (
    <div className="space-y-6">
      <Link to="/client" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao resumo</Link>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ChartNoAxesColumn className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA · PAINEL EMPRESARIAL</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Estatísticas</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Indicadores reais, calculados a partir dos registos existentes na tua conta. Nenhum valor é estimado.</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} /> Actualizar
          </button>
          {lastUpdated && <p className="text-xs text-muted-foreground">Actualizado {formatDate(lastUpdated)}</p>}
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div className="flex-1"><p className="font-semibold">Erro ao carregar estatísticas</p><p className="mt-1">{error}</p></div><button type="button" onClick={() => void load()} className="font-semibold underline">Tentar novamente</button></div>}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[1,2,3,4,5].map((n) => <div key={n} className="h-24 animate-pulse rounded-2xl border border-border bg-muted/40" />)}</div>
      ) : !error && tasks.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><ChartNoAxesColumn className="h-6 w-6" /></span>
          <h2 className="mt-4 font-semibold">Ainda não há dados para analisar</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">As estatísticas aparecem aqui depois de criares as primeiras tarefas e de existirem participações registadas.</p>
          <Link to="/client/tasks/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"><FilePlus2 className="h-4 w-4" /> Criar a primeira tarefa</Link>
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Tarefas</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {taskCards.map((item) => (
                <article key={item.label} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{item.value}</p></div>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"><item.icon className="h-4 w-4" /></span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Participações</h2>
            {submissionsAvailable ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {submissionCards.map((item) => (
                  <article key={item.label} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums">{item.value}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Os dados de participação não estão disponíveis neste momento.</p>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="font-semibold">Participações por tarefa</h2></div>
            <div className="divide-y divide-border">
              {published.map((task) => {
                const counts = countsByTask.get(task.id) ?? { participations: 0, approved: 0 };
                return (
                  <div key={task.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{task.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{taskStatusLabels[task.status] ?? task.status} · Criada {formatDate(task.created_at)} · {task.category || "Sem categoria"}</p>
                    </div>
                    <div className="flex shrink-0 gap-5 text-sm">
                      <span className="text-muted-foreground">Participações: <strong className="text-foreground tabular-nums">{counts.participations}</strong></span>
                      <span className="text-muted-foreground">Aprovadas: <strong className="text-foreground tabular-nums">{counts.approved}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <p className="flex items-start gap-2 text-xs text-muted-foreground"><XCircle className="h-4 w-4 shrink-0" /> Estatísticas financeiras (orçamento, custos por participação e retorno) serão adicionadas quando o módulo financeiro empresarial for activado.</p>
        </>
      )}
      <span className="hidden"><LoaderCircle /></span>
    </div>
  );
}
