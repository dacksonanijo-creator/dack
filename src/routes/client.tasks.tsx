import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  ArrowLeft, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, Eye, Filter, LoaderCircle, RefreshCw, Search, ShieldAlert, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";

const db = supabase as any;
const PAGE_SIZE = 20;

type TaskRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  reward: number | null;
  currency: string | null;
  budget_total: number | null;
  budget_reserved: number | null;
  budget_approved: number | null;
  budget_paid: number | null;
  slots: number | null;
  slots_filled: number | null;
};
type AuditRow = { id: string; action: string; metadata: Record<string, unknown> | null; created_at: string; actor_id: string | null };
type Counts = { participations: number; approved: number };

export const Route = createFileRoute("/client/tasks")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    if (isAdminEmail(data.user.email)) throw redirect({ to: "/admin" });
    const { data: profile, error: profileError } = await db.from("profiles")
      .select("account_type").eq("id", data.user.id).maybeSingle();
    if (profileError || profile?.account_type !== "client") throw redirect({ to: "/app" });
    return { userId: data.user.id };
  },
  component: ClientTasksPage,
});

const statusPresentation: Record<string, { label: string; className: string; description: string }> = {
  active: { label: "Publicada", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", description: "A tarefa está ativa no sistema." },
  paused: { label: "Pausada", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", description: "A tarefa está temporariamente pausada." },
  completed: { label: "Concluída", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300", description: "A tarefa está marcada como concluída." },
};
const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";
const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(date);
};
const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(date);
};
const formatMoney = (value: number | null | undefined, currency: string | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value)) + (currency ? " " + currency : "");
};
const actionLabel = (action: string) => {
  const key = action.toLowerCase();
  if (key.includes("reject")) return "Tarefa rejeitada";
  if (key.includes("correction")) return "Correções solicitadas";
  if (key.includes("approv")) return "Tarefa aprovada";
  if (key.includes("cancel")) return "Tarefa cancelada";
  if (key.includes("pause")) return "Tarefa pausada";
  if (key.includes("status")) return "Estado alterado";
  if (key.includes("terms")) return "Condições da tarefa alteradas";
  return "Registo de atividade";
};

function ClientTasksPage() {
  const { userId } = Route.useRouteContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at">("created_at");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [history, setHistory] = useState<AuditRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: companies, error: companiesError } = await db.from("companies")
        .select("id").eq("owner_id", userId);
      if (companiesError) throw companiesError;
      const ids = (companies ?? []).map((item: { id: string }) => item.id as string);
      if (ids.length === 0) {
        setTasks([]); setTotal(0); setCategories([]); setCounts({});
        setLoading(false);
        return;
      }

      const { data: categoryRows, error: categoryError } = await db.from("tasks")
        .select("category").in("company_id", ids);
      if (categoryError) throw categoryError;
      setCategories(Array.from(new Set((categoryRows ?? []).map((row: { category: string | null }) => row.category).filter(Boolean))) as string[]);

      let request = db.from("tasks")
        .select("id,title,description,category,status,created_at,updated_at,company_id,reward,currency,budget_total,budget_reserved,budget_approved,budget_paid,slots,slots_filled", { count: "exact" })
        .in("company_id", ids);
      if (query.trim()) request = request.ilike("title", "%" + query.trim().replace(/[%_]/g, "\\$&") + "%");
      if (status !== "all") request = request.eq("status", status);
      if (category !== "all") request = request.eq("category", category);
      if (dateFrom) request = request.gte("created_at", new Date(dateFrom + "T00:00:00").toISOString());
      if (dateTo) request = request.lt("created_at", new Date(new Date(dateTo + "T00:00:00").getTime() + 86400000).toISOString());
      const offset = (page - 1) * PAGE_SIZE;
      const { data: taskRows, error: taskError, count: taskCount } = await request
        .order(sortBy, { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
      if (taskError) throw taskError;
      const ownTasks = (taskRows ?? []) as TaskRow[];
      setTasks(ownTasks);
      setTotal(taskCount ?? 0);

      const idsOnPage = ownTasks.map((task) => task.id);
      if (idsOnPage.length === 0) { setCounts({}); setLoading(false); return; }
      const { data: submissionRows, error: submissionError } = await db.from("task_submissions")
        .select("task_id,status").in("task_id", idsOnPage);
      if (submissionError) {
        setCounts({});
      } else {
        const next: Record<string, Counts> = {};
        for (const taskId of idsOnPage) next[taskId] = { participations: 0, approved: 0 };
        for (const row of (submissionRows ?? []) as { task_id: string; status: string }[]) {
          if (!next[row.task_id]) continue;
          next[row.task_id].participations += 1;
          if (row.status === "approved") next[row.task_id].approved += 1;
        }
        setCounts(next);
      }
    } catch (err) {
      console.error("Taskora client tasks load failed", err);
      setError("Não foi possível carregar as tarefas desta conta. Verifica a ligação e tenta novamente.");
      setTasks([]); setTotal(0); setCounts({});
    } finally {
      setLoading(false);
    }
  }, [userId, query, status, category, dateFrom, dateTo, sortBy, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [query, status, category, dateFrom, dateTo, sortBy]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(query || status !== "all" || category !== "all" || dateFrom || dateTo);
  const openDetails = async (task: TaskRow) => {
    setSelected(task);
    setHistory([]);
    setDetailError("");
    setDetailLoading(true);
    const { data, error: historyError } = await db.from("task_audit_log")
      .select("id,action,metadata,created_at,actor_id")
      .eq("task_id", task.id).order("created_at", { ascending: false }).limit(50);
    if (historyError) setDetailError("O histórico de alterações não está disponível neste momento.");
    else setHistory((data ?? []) as AuditRow[]);
    setDetailLoading(false);
  };
  const clearFilters = () => { setQuery(""); setStatus("all"); setCategory("all"); setDateFrom(""); setDateTo(""); setSortBy("created_at"); setPage(1); };

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-9">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link to="/client" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao painel empresarial</Link>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></span>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA · PAINEL EMPRESARIAL</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Minhas tarefas</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Consulta o estado e os resultados das tarefas associadas à tua conta.</p></div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} /> Actualizar</button>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><h2 className="font-semibold">Pesquisar e filtrar</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-medium text-muted-foreground xl:col-span-2">Nome da tarefa<div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className={inputClass + " pl-9"} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar pelo nome…" /></div></label>
            <label className="text-xs font-medium text-muted-foreground">Estado<select className={inputClass + " mt-1"} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todos os estados</option><option value="active">Publicada</option><option value="paused">Pausada</option><option value="completed">Concluída</option></select></label>
            <label className="text-xs font-medium text-muted-foreground">Categoria<select className={inputClass + " mt-1"} value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="text-xs font-medium text-muted-foreground">Criada a partir de<input type="date" className={inputClass + " mt-1"} value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label className="text-xs font-medium text-muted-foreground">Criada até<input type="date" className={inputClass + " mt-1"} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} /></label>
            <label className="text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-1">Ordenar por<select className={inputClass + " mt-1"} value={sortBy} onChange={(e) => setSortBy(e.target.value as "created_at" | "updated_at")}><option value="created_at">Data de criação</option><option value="updated_at">Última atualização</option></select></label>
            {hasFilters && <div className="flex items-end"><button type="button" onClick={clearFilters} className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium hover:bg-muted">Limpar filtros</button></div>}
          </div>
        </section>

        {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div className="flex-1"><p className="font-semibold">Erro ao carregar tarefas</p><p className="mt-1">{error}</p></div><button type="button" onClick={() => void load()} className="font-semibold underline">Tentar novamente</button></div>}

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-5"><h2 className="font-semibold">Lista de tarefas</h2><span className="text-sm text-muted-foreground">{loading ? "A carregar…" : total + (total === 1 ? " tarefa" : " tarefas")}</span></div>
          {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /> A carregar as tuas tarefas…</div>
          : !error && total === 0 ? <div className="px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><CalendarDays className="h-6 w-6" /></span><h3 className="mt-4 font-semibold">{hasFilters ? "Nenhuma tarefa encontrada" : "Ainda não tens tarefas"}</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{hasFilters ? "Não existem tarefas que correspondam aos filtros seleccionados. Experimenta alterar a pesquisa." : "As tarefas associadas à tua conta aparecerão aqui quando forem criadas."}</p>{hasFilters ? <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Limpar filtros</button> : <button type="button" disabled className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground opacity-60" title="A criação de tarefas empresariais ainda não está disponível"><CircleHelp className="h-4 w-4" /> Criar tarefa · Indisponível</button>}</div>
          : !error && <><div className="divide-y divide-border">{tasks.map((task) => {
            const presentation = statusPresentation[task.status] ?? { label: task.status, className: "bg-muted text-muted-foreground", description: "Estado guardado no sistema." };
            const count = counts[task.id];
            const used = task.budget_total == null ? null : Number(task.budget_reserved ?? 0) + Number(task.budget_approved ?? 0) + Number(task.budget_paid ?? 0);
            const remaining = task.budget_total == null || used == null ? null : Math.max(0, Number(task.budget_total) - used);
            return <article key={task.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{task.title}</h3><span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + presentation.className}>{presentation.label}</span><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{task.category || "Sem categoria"}</span></div><p className="mt-1 text-xs text-muted-foreground">Criada {formatDate(task.created_at)} · Actualizada {formatDate(task.updated_at)}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span>{count ? count.participations + " participações" : count ? "0 participações" : "Participações: —"}</span><span>{count ? count.approved + " conclusões aprovadas" : "Conclusões aprovadas: —"}</span>{task.budget_total != null && <span>Orçamento: {formatMoney(task.budget_total, task.currency)}</span>}{used != null && <span>Utilizado: {formatMoney(used, task.currency)}</span>}{remaining != null && <span>Restante: {formatMoney(remaining, task.currency)}</span>}</div></div>
              <button type="button" onClick={() => void openDetails(task)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"><Eye className="h-4 w-4" /> Ver detalhes</button>
            </article>;
          })}</div><div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5"><p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Anterior</button><button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40">Seguinte <ChevronRight className="h-4 w-4" /></button></div></div></>}
        </section>
        <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldAlert className="h-4 w-4 shrink-0" /> Nesta etapa, apenas os estados existentes na base de dados são apresentados. A edição, pausa e cancelamento permanecem indisponíveis enquanto não houver regras autorizadas para essas ações.</p>
      </div>
      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="task-detail-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-border bg-background p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhes da tarefa</p><h2 id="task-detail-title" className="mt-1 break-words text-xl font-bold">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes" className="rounded-lg p-2 hover:bg-muted"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Detail label="Estado" value={statusPresentation[selected.status]?.label ?? selected.status} /><Detail label="Categoria" value={selected.category || "—"} /><Detail label="Data de criação" value={formatDateTime(selected.created_at)} /><Detail label="Última atualização" value={formatDateTime(selected.updated_at)} /><Detail label="Participações" value={counts[selected.id] ? String(counts[selected.id].participations) : "Não disponível"} /><Detail label="Conclusões aprovadas" value={counts[selected.id] ? String(counts[selected.id].approved) : "Não disponível"} />{selected.budget_total != null && <Detail label="Orçamento total" value={formatMoney(selected.budget_total, selected.currency)} />}{selected.budget_total != null && <Detail label="Orçamento utilizado" value={formatMoney(Number(selected.budget_reserved ?? 0) + Number(selected.budget_approved ?? 0) + Number(selected.budget_paid ?? 0), selected.currency)} />}{selected.budget_total != null && <Detail label="Orçamento restante" value={formatMoney(Math.max(0, Number(selected.budget_total) - Number(selected.budget_reserved ?? 0) - Number(selected.budget_approved ?? 0) - Number(selected.budget_paid ?? 0)), selected.currency)} />}</div><div className="mt-5 rounded-xl border border-border bg-muted/20 p-4"><h3 className="font-semibold">Descrição</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{selected.description || "Sem descrição registada."}</p></div><div className="mt-6"><h3 className="font-semibold">Histórico registado</h3><p className="mt-1 text-xs text-muted-foreground">São apresentados apenas os eventos realmente guardados no registo de auditoria.</p>{detailLoading ? <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> A carregar histórico…</div> : detailError ? <p role="alert" className="mt-3 text-sm text-destructive">{detailError}</p> : history.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Ainda não existem eventos de auditoria disponíveis para esta tarefa.</p> : <ol className="mt-3 space-y-3">{history.map((event) => { const reason = event.metadata?.reason ?? event.metadata?.decision_reason; return <li key={event.id} className="flex gap-3 rounded-xl border border-border p-3"><span className="mt-0.5 text-primary"><Clock3 className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm font-medium">{actionLabel(event.action)}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.created_at)}</p>{typeof reason === "string" && reason.trim() && <p className="mt-2 text-sm">Motivo: {reason}</p>}</div></li>; })}</ol>}</div><div className="mt-6 flex justify-end"><button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Fechar</button></div></section></div>}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>;
}
