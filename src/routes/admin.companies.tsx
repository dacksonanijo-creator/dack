import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Search, RefreshCw, CheckCircle2, XCircle, MessageSquareWarning, Ban, RotateCcw, History, X } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
type BusinessClient = {
  id: string; full_name: string | null; email: string | null; phone: string | null; country: string | null;
  business_name: string | null; business_type: string | null; business_category: string | null;
  business_contact: string | null; business_website: string | null; business_description: string | null;
  verification_status: string; created_at: string; updated_at: string;
};
type Decision = { id: string; action: string; reason: string | null; previous_status: string | null; new_status: string; created_at: string; admin_user_id: string | null };

export const Route = createFileRoute("/admin/companies")({
  head: () => ({ meta: [
    { title: "Clientes empresariais — Admin Taskora" },
    { name: "robots", content: "noindex" },
    { name: "description", content: "Verificação e gestão dos perfis empresariais." },
  ] }),
  component: Page,
});

const statuses: Record<string, string> = {
  not_started: "Incompleto", incomplete: "Incompleto", pending: "Pendente de verificação",
  verified: "Verificado", rejected: "Rejeitado", corrections_required: "Correções necessárias", suspended: "Suspenso",
};
const types: Record<string, string> = { empresa: "Empresa", comerciante: "Comerciante", criador_conteudo: "Criador de conteúdo", outro: "Outro" };
const actionLabels: Record<string, string> = {
  submitted: "Submeteu para análise", approved: "Aprovou", rejected: "Rejeitou",
  corrections_required: "Solicitou correções", suspended: "Suspendeu", reactivated: "Reativou",
};
const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

function Page() {
  const [clients, setClients] = useState<BusinessClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<BusinessClient | null>(null);
  const [history, setHistory] = useState<Decision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.rpc("admin_list_business_clients");
    if (error) toast.error("Não foi possível carregar clientes empresariais. Confirma se a migração da Etapa 2 foi aplicada no Supabase.");
    else setClients((data ?? []) as BusinessClient[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesTerm = !term || [client.business_name, client.email, client.id, client.full_name].some((value) => value?.toLowerCase().includes(term));
      return matchesTerm && (typeFilter === "all" || client.business_type === typeFilter) &&
        (statusFilter === "all" || client.verification_status === statusFilter);
    });
  }, [clients, search, typeFilter, statusFilter]);

  const showHistory = async (client: BusinessClient) => {
    setSelected(client); setHistory([]); setHistoryLoading(true);
    const { data, error } = await db.from("business_profile_decisions").select("id,action,reason,previous_status,new_status,created_at,admin_user_id").eq("client_user_id", client.id).order("created_at", { ascending: false }).limit(50);
    if (error) toast.error("Não foi possível carregar o histórico.");
    else setHistory((data ?? []) as Decision[]);
    setHistoryLoading(false);
  };

  const decide = async (client: BusinessClient, action: string) => {
    const reasonRequired = ["reject", "corrections", "suspend"].includes(action);
    const labels: Record<string, string> = { approve: "aprovar", reject: "rejeitar", corrections: "solicitar correções", suspend: "suspender", reactivate: "reativar" };
    const reason = window.prompt(reasonRequired ? `Indica a justificação para ${labels[action]} este cliente:` : `Motivo ou nota administrativa para ${labels[action]} (opcional):`, "");
    if (reason === null) return;
    if (reasonRequired && !reason.trim()) { toast.error("A justificação é obrigatória."); return; }
    setBusyId(client.id);
    const { error } = await db.rpc("admin_decide_business_client", { p_client_user_id: client.id, p_action: action, p_reason: reason.trim() || null });
    setBusyId(null);
    if (error) { toast.error(error.message || "Não foi possível aplicar a decisão."); return; }
    toast.success("Decisão administrativa registada.");
    await load();
    if (selected?.id === client.id) await showHistory({ ...client, verification_status: action === "approve" ? "verified" : action === "suspend" ? "suspended" : action === "corrections" ? "corrections_required" : action === "reject" ? "rejected" : client.verification_status });
  };

  return <div className="space-y-5">
    <AdminPageHeader title="Clientes empresariais" description="Consulta perfis, analisa pedidos de verificação e regista decisões administrativas." />
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input className={inputClass + " pl-9"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar nome, email ou identificador" aria-label="Pesquisar clientes empresariais" /></div>
        <select className={inputClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrar por tipo"><option value="all">Todos os tipos</option>{Object.entries(types).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar por estado"><option value="all">Todos os estados</option>{Object.entries(statuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} />Atualizar</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{filtered.length} cliente(s) empresarial(is) {search || typeFilter !== "all" || statusFilter !== "all" ? "correspondem aos filtros" : "registado(s)"}.</p>
    </section>
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      {loading ? <p className="p-8 text-center text-sm text-muted-foreground">A carregar clientes…</p> : filtered.length === 0 ? <div className="p-10 text-center"><Building2 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Nenhum cliente encontrado</p><p className="mt-1 text-sm text-muted-foreground">Não existem registos para os filtros selecionados.</p></div> :
        <div className="divide-y divide-border">{filtered.map((client) => <article key={client.id} className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <button type="button" onClick={() => void showHistory(client)} className="min-w-0 text-left">
              <h2 className="font-semibold">{client.business_name || client.full_name || "Nome não preenchido"}</h2>
              <p className="mt-1 break-all text-sm text-muted-foreground">{client.email || "Sem email"} · {types[client.business_type ?? ""] || "Tipo não indicado"}</p>
              <p className="mt-1 text-xs text-muted-foreground">ID: {client.id} · Registo: {new Date(client.created_at).toLocaleDateString("pt-PT")}</p>
              <span className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{statuses[client.verification_status] || client.verification_status}</span>
            </button>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void showHistory(client)}><History className="mr-1.5 h-4 w-4" />Detalhes e histórico</Button>
              {client.verification_status === "pending" && <>
                <Button size="sm" disabled={busyId === client.id} onClick={() => void decide(client, "approve")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Aprovar</Button>
                <Button size="sm" variant="outline" disabled={busyId === client.id} onClick={() => void decide(client, "corrections")}><MessageSquareWarning className="mr-1.5 h-4 w-4" />Pedir correções</Button>
                <Button size="sm" variant="destructive" disabled={busyId === client.id} onClick={() => void decide(client, "reject")}><XCircle className="mr-1.5 h-4 w-4" />Rejeitar</Button>
              </>}
              {client.verification_status !== "suspended" && <Button size="sm" variant="outline" disabled={busyId === client.id} onClick={() => void decide(client, "suspend")}><Ban className="mr-1.5 h-4 w-4" />Suspender</Button>}
              {client.verification_status === "suspended" && <Button size="sm" variant="outline" disabled={busyId === client.id} onClick={() => void decide(client, "reactivate")}><RotateCcw className="mr-1.5 h-4 w-4" />Reativar</Button>}
            </div>
          </div>
        </article>)}</div>}
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Detalhes do cliente empresarial">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-background p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{selected.business_name || selected.full_name || "Perfil empresarial"}</h2><p className="text-sm text-muted-foreground">Detalhes do perfil e histórico de decisões</p></div><Button size="icon" variant="ghost" aria-label="Fechar detalhes" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button></div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">{[
          ["Tipo de cliente", types[selected.business_type ?? ""] || "—"], ["Categoria", selected.business_category || "—"],
          ["País", selected.country || "—"], ["Telefone", selected.phone || "—"], ["Email", selected.email || "—"],
          ["Website", selected.business_website || "—"], ["Descrição", selected.business_description || "—"],
          ["Data de registo", new Date(selected.created_at).toLocaleString("pt-PT")], ["Última atualização", new Date(selected.updated_at).toLocaleString("pt-PT")], ["Identificador", selected.id],
        ].map(([label,value]) => <div key={label} className="min-w-0 rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>
        <div className="mt-6"><h3 className="font-semibold">Histórico administrativo</h3>{historyLoading ? <p className="py-4 text-sm text-muted-foreground">A carregar histórico…</p> : history.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Ainda não existem decisões registadas.</p> : <ol className="mt-3 space-y-3">{history.map((item) => <li key={item.id} className="rounded-xl border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{actionLabels[item.action] || item.action}</p><time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-PT")}</time></div><p className="mt-1 text-xs text-muted-foreground">Estado: {statuses[item.previous_status ?? ""] || "—"} → {statuses[item.new_status] || item.new_status}</p><p className="mt-1 text-sm">{item.reason || "Sem motivo adicional."}</p><p className="mt-1 break-all text-[11px] text-muted-foreground">Administrador: {item.admin_user_id || "Sistema / submissão do cliente"}</p></li>)}</ol>}</div>
      </div>
    </div>}
  </div>;
}
