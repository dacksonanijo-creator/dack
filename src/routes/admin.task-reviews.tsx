import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, Eye, MessageSquareWarning, RefreshCw, Search, ShieldAlert, XCircle, X } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type TaskReview = {
  id: string; title: string; description: string; category: string; slots: number;
  target_country: string | null; target_language: string | null; destination_url: string | null;
  completion_criteria: string; deadline: string | null;
  review_status: string | null; review_reason: string | null; reviewed_at: string | null;
  created_at: string; updated_at: string;
  company_id: string; company_name: string; owner_id: string;
  owner_email: string | null; verification_status: string | null;
};

export const Route = createFileRoute("/admin/task-reviews")({
  head: () => ({ meta: [
    { title: "Moderação de tarefas — Admin Taskora" },
    { name: "robots", content: "noindex" },
    { name: "description", content: "Fila de análise das campanhas submetidas pelas empresas." },
  ] }),
  component: TaskReviewsPage,
});

const reviewPresentation: Record<string, { label: string; className: string }> = {
  pending: { label: "Em análise", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  approved: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "Rejeitada", className: "bg-destructive/10 text-destructive" },
  corrections_required: { label: "Correções pedidas", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  not_submitted: { label: "Não submetida", className: "bg-muted text-muted-foreground" },
};
const categories: Record<string, string> = {
  questionnaires_surveys: "Questionários e pesquisas",
  website_app_testing: "Testes de sites e aplicações",
  product_service_review: "Avaliação de produtos e serviços",
  verified_page_visits: "Visitas verificáveis",
  content_promotion: "Promoção de conteúdo",
  media_promotion: "Divulgação de vídeos e músicas",
  other_digital: "Outras tarefas digitais",
};
const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

function TaskReviewsPage() {
  const [items, setItems] = useState<TaskReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<TaskReview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.rpc("admin_list_company_task_reviews");
    if (error) toast.error(error.message || "Não foi possível carregar a fila de moderação.");
    else setItems((data ?? []) as TaskReview[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((task) => {
      const matchesTerm = !term || [task.title, task.company_name, task.owner_email, task.id].some((value) => value?.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "not_submitted" ? !task.review_status : task.review_status === statusFilter);
      return matchesTerm && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const decide = async (task: TaskReview, action: "approve" | "reject" | "corrections") => {
    const labels = { approve: "aprovar", reject: "rejeitar", corrections: "solicitar correções para" } as const;
    const reasonRequired = action !== "approve";
    const reason = window.prompt(
      reasonRequired ? `Indica a justificação para ${labels[action]} esta campanha:` : `Nota administrativa (opcional):`,
      "",
    );
    if (reason === null) return;
    if (reasonRequired && !reason.trim()) { toast.error("A justificação é obrigatória."); return; }
    setBusyId(task.id);
    const { error } = await db.rpc("admin_review_company_task", { p_task_id: task.id, p_action: action, p_reason: reason.trim() || null });
    setBusyId(null);
    if (error) { toast.error(error.message || "Não foi possível aplicar a decisão."); return; }
    toast.success(action === "approve" ? "Campanha aprovada. A publicação continua dependente do fluxo de orçamento." : "Decisão registada e visível para a empresa.");
    setSelected(null);
    await load();
  };

  return <div className="space-y-5">
    <AdminPageHeader title="Moderação de tarefas" description="Analisa as campanhas submetidas pelas empresas antes de qualquer publicação." />
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input className={inputClass + " pl-9"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar título, empresa ou email" aria-label="Pesquisar campanhas" /></div>
        <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar por estado de análise">
          <option value="pending">Em análise</option>
          <option value="approved">Aprovadas</option>
          <option value="rejected">Rejeitadas</option>
          <option value="corrections_required">Correções pedidas</option>
          <option value="not_submitted">Não submetidas</option>
          <option value="all">Todos os estados</option>
        </select>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} />Atualizar</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{filtered.length} campanha(s) {search || statusFilter !== "all" ? "correspondem aos filtros" : "na lista"}. A aprovação da análise não publica a campanha — a publicação depende do fluxo de orçamento.</p>
    </section>

    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      {loading ? <p className="p-8 text-center text-sm text-muted-foreground">A carregar campanhas…</p>
      : filtered.length === 0 ? <div className="p-10 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Nada para mostrar</p><p className="mt-1 text-sm text-muted-foreground">Não existem campanhas para o filtro selecionado.</p></div>
      : <div className="divide-y divide-border">{filtered.map((task) => {
        const presentation = reviewPresentation[task.review_status ?? "not_submitted"] ?? { label: task.review_status ?? "Não submetida", className: "bg-muted text-muted-foreground" };
        return <article key={task.id} className="p-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <button type="button" onClick={() => setSelected(task)} className="min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{task.title}</h2>
                <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + presentation.className}>{presentation.label}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{categories[task.category] || task.category}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{task.company_name} · {task.owner_email || "Sem email"} · {task.slots} conclusão(ões)</p>
              {task.review_reason && <p className="mt-1 text-xs text-muted-foreground">Última justificação: {task.review_reason}</p>}
            </button>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(task)}><Eye className="mr-1.5 h-4 w-4" />Ver detalhes</Button>
              {task.review_status !== "approved" && task.review_status !== "pending" && task.review_status !== null &&
                <Button size="sm" disabled={busyId === task.id} onClick={() => void decide(task, "approve")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Aprovar</Button>}
              {task.review_status === null &&
                <Button size="sm" disabled={busyId === task.id} onClick={() => void decide(task, "approve")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Aprovar</Button>}
              {task.review_status === "pending" &&
                <Button size="sm" disabled={busyId === task.id} onClick={() => void decide(task, "approve")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Aprovar</Button>}
              {(task.review_status === "pending" || task.review_status === "rejected" || task.review_status === "corrections_required") && <>
                <Button size="sm" variant="outline" disabled={busyId === task.id} onClick={() => void decide(task, "corrections")}><MessageSquareWarning className="mr-1.5 h-4 w-4" />Pedir correções</Button>
                <Button size="sm" variant="destructive" disabled={busyId === task.id} onClick={() => void decide(task, "reject")}><XCircle className="mr-1.5 h-4 w-4" />Rejeitar</Button>
              </>}
            </div>
          </div>
        </article>;
      })}</div>}
    </section>

    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Detalhes da campanha">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-background p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{selected.title}</h2><p className="text-sm text-muted-foreground">Campanha de {selected.company_name}</p></div><Button size="icon" variant="ghost" aria-label="Fechar detalhes" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button></div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">{[
          ["Categoria", categories[selected.category] || selected.category], ["Conclusões pretendidas", String(selected.slots)],
          ["Público-alvo", selected.target_country || "Não especificado"], ["Idioma", selected.target_language || "Não especificado"],
          ["Prazo", selected.deadline ? new Date(selected.deadline).toLocaleString("pt-PT") : "—"],
          ["Estado da conta da empresa", selected.verification_status || "—"],
          ["Submetida a", selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString("pt-PT") : "—"],
          ["Identificador", selected.id],
        ].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Descrição</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{selected.description}</p></div>
          <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">Critérios de conclusão</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{selected.completion_criteria}</p></div>
          {selected.destination_url && <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">Link de destino</p><a href={selected.destination_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-medium text-primary underline">{selected.destination_url}</a></div>}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {selected.review_status === "pending" || selected.review_status === null || selected.review_status === "rejected" || selected.review_status === "corrections_required" ? <>
            <Button disabled={busyId === selected.id} onClick={() => void decide(selected, "approve")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Aprovar campanha</Button>
            <Button variant="outline" disabled={busyId === selected.id} onClick={() => void decide(selected, "corrections")}><MessageSquareWarning className="mr-1.5 h-4 w-4" />Pedir correções</Button>
            <Button variant="destructive" disabled={busyId === selected.id} onClick={() => void decide(selected, "reject")}><XCircle className="mr-1.5 h-4 w-4" />Rejeitar</Button>
          </> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="h-4 w-4" />Esta campanha já foi analisada ({reviewPresentation[selected.review_status]?.label ?? selected.review_status}).</p>}
        </div>
      </div>
    </div>}
  </div>;
}
