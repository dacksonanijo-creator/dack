import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, BriefcaseBusiness, CheckCircle2, CircleHelp, Clock3,
  ClipboardList, CreditCard, FilePlus2, History, LoaderCircle, RefreshCw,
  Settings2, ShieldAlert, Users, Activity, LockKeyhole, AlertCircle, Menu, X, LogOut, Bell, Wallet, FileText, Megaphone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { Button } from "@/components/ui/button";

const db = supabase as any;

type ClientProfile = {
  account_type: string;
  full_name: string | null;
  business_name: string | null;
  verification_status: string | null;
  email: string | null;
  business_type?: string | null;
  country?: string | null;
  business_category?: string | null;
  phone?: string | null;
};
type TaskRow = {
  id: string; title: string; status: string; created_at: string; updated_at: string;
  company_id: string | null; budget_total?: number | null; budget_approved?: number | null;
  budget_paid?: number | null; budget_reserved?: number | null;
};
type ActivityRow = { id: string; task_id: string; action: string; metadata: Record<string, unknown> | null; created_at: string };
type RecentItem = { id: string; title: string; detail: string; status: string; date: string };

export const Route = createFileRoute("/client")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    if (isAdminEmail(data.user.email)) throw redirect({ to: "/admin" });
    const { data: profile, error: profileError } = await db.from("profiles")
      .select("account_type,full_name,business_name,verification_status,email,business_type,country,business_category,phone")
      .eq("id", data.user.id).maybeSingle();
    if (profileError || profile?.account_type !== "client") throw redirect({ to: "/app" });
    return { userId: data.user.id, profile: profile as ClientProfile, authEmail: data.user.email ?? null };
  },
  component: ClientDashboard,
});

const statusLabels: Record<string, string> = {
  not_started: "Incompleto", incomplete: "Incompleto", pending: "Pendente de verificação",
  verified: "Verificado", rejected: "Rejeitado", corrections_required: "Correções necessárias",
  suspended: "Suspenso",
};
const statusStyles: Record<string, string> = {
  verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  suspended: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  corrections_required: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};
const taskStatusLabels: Record<string, string> = {
  active: "Ativa", paused: "Pausada", completed: "Concluída",
};
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const quickLinks = [
  { label: "Perfil empresarial", description: "Dados e estado da conta", icon: Settings2, available: true, to: "/client/profile" },
  { label: "Minhas tarefas", description: "Consultar e filtrar tarefas da conta", icon: ClipboardList, available: true, to: "/client/tasks" },
  { label: "Criar tarefa", description: "Preparar e guardar um rascunho", icon: FilePlus2, available: true, to: "/client/tasks/new" },
  { label: "Carteira e orçamento", description: "Disponível com o módulo empresarial", icon: CreditCard, available: false },
  { label: "Participações e resultados", description: "Acompanhar resultados", icon: Users, available: false },
  { label: "Estatísticas", description: "Análise detalhada da atividade", icon: BarChart3, available: false },
  { label: "Ajuda", description: "Orientações para a conta", icon: CircleHelp, available: false },
];

function ClientDashboard() {
  const { userId, profile, authEmail } = Route.useRouteContext();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [participations, setParticipations] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [participationAvailable, setParticipationAvailable] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setTasks([]);
    setParticipations(null);
    setRecent([]);
    setParticipationAvailable(true);
    try {
      // The owner filter is explicit; database RLS remains the security boundary.
      const { data: companies, error: companyError } = await db.from("companies")
        .select("id").eq("owner_id", userId);
      if (companyError) throw companyError;
      const companyIds = (companies ?? []).map((company: { id: string }) => company.id);
      if (companyIds.length === 0) {
        setTasks([]);
        setParticipations(0);
        setRecent([]);
        setParticipationAvailable(true);
        setLoading(false);
        return;
      }

      const { data: taskRows, error: taskError } = await db.from("tasks")
        .select("id,title,status,created_at,updated_at,company_id")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false });
      if (taskError) throw taskError;
      const ownTasks = (taskRows ?? []) as TaskRow[];
      setTasks(ownTasks);

      const taskIds = ownTasks.map((task) => task.id);
      if (taskIds.length === 0) {
        setParticipations(0);
        setRecent([]);
        setParticipationAvailable(true);
        setLoading(false);
        return;
      }

      const [submissionResult, auditResult] = await Promise.all([
        db.from("task_submissions").select("id,task_id,status,created_at").in("task_id", taskIds),
        db.from("task_audit_log").select("id,task_id,action,metadata,created_at").in("task_id", taskIds).order("created_at", { ascending: false }).limit(20),
      ]);

      if (submissionResult.error) {
        setParticipationAvailable(false);
        setParticipations(null);
      } else {
        setParticipationAvailable(true);
        setParticipations((submissionResult.data ?? []).length);
      }

      const taskById = new Map<string, TaskRow>(ownTasks.map((task) => [task.id, task] as const));
      const activityItems: RecentItem[] = [];
      for (const task of ownTasks) {
        activityItems.push({
          id: "created-" + task.id,
          title: "Tarefa criada",
          detail: task.title,
          status: taskStatusLabels[task.status] ?? task.status,
          date: task.created_at,
        });
      }
      if (!auditResult.error) {
        for (const event of (auditResult.data ?? []) as ActivityRow[]) {
          const task = taskById.get(event.task_id);
          if (!task) continue;
          const action = event.action.toUpperCase();
          const label = action.includes("REJECT") ? "Tarefa rejeitada"
            : action.includes("CANCEL") ? "Tarefa cancelada"
            : action.includes("APPROV") ? "Tarefa aprovada"
            : action.includes("STATUS") ? "Estado da tarefa alterado"
            : "Tarefa atualizada";
          activityItems.push({
            id: "audit-" + event.id,
            title: label,
            detail: task.title,
            status: taskStatusLabels[task.status] ?? task.status,
            date: event.created_at,
          });
        }
      }
      setRecent(activityItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8));
    } catch (error) {
      console.error("Taskora client dashboard load failed", error);
      setLoadError("Não foi possível carregar os dados da conta. Verifica a ligação e tenta novamente.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);


  const signOut = async () => {
    if (signingOut) return;
    if (!window.confirm("Queres terminar a sessão da conta empresarial?")) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      console.error("Taskora sign out failed", error);
      window.alert("Não foi possível terminar a sessão. Verifica a ligação e tenta novamente.");
      return;
    }
    setMenuOpen(false);
    await navigate({ to: "/", replace: true });
  };

  const navGroups = [
    { title: "MENU PRINCIPAL", items: [
      { label: "Visão geral", to: "/client", icon: BriefcaseBusiness, available: true },
      { label: "Criar tarefa", to: "/client/tasks/new", icon: FilePlus2, available: true },
      { label: "Minhas tarefas", to: "/client/tasks", icon: ClipboardList, available: true },
      { label: "Campanhas", icon: Megaphone, available: false, detail: "A gestão de campanhas ainda não está disponível." },
      { label: "Participações", icon: Users, available: false, detail: "A gestão detalhada de participações ainda não está disponível." },
      { label: "Resultados", icon: BarChart3, available: false, detail: "Os resultados detalhados ainda não estão disponíveis." }
    ]},
    { title: "GESTÃO FINANCEIRA", items: [
      { label: "Carteira empresarial", icon: Wallet, available: false, detail: "A carteira empresarial ainda não está disponível." },
      { label: "Adicionar fundos", icon: CreditCard, available: false, detail: "Os depósitos empresariais ainda não estão disponíveis." },
      { label: "Histórico financeiro", icon: History, available: false, detail: "O histórico financeiro empresarial ainda não está disponível." },
      { label: "Faturação", icon: FileText, available: false, detail: "A faturação empresarial ainda não está disponível." }
    ]},
    { title: "CONTA EMPRESARIAL", items: [
      { label: "Perfil empresarial", to: "/client/profile", icon: Settings2, available: true },
      { label: "Verificação da conta", to: "/client/profile", icon: ShieldAlert, available: true },
      { label: "Notificações", icon: Bell, available: false, detail: "As notificações empresariais ainda não estão disponíveis." },
      { label: "Definições", icon: Settings2, available: false, detail: "As definições empresariais ainda não estão disponíveis." },
      { label: "Ajuda e suporte", icon: CircleHelp, available: false, detail: "A área de ajuda e suporte ainda não está disponível." }
    ]}
  ];

  const displayName = profile.business_name?.trim() || profile.full_name?.trim() || authEmail || "Cliente";
  const verificationStatus = profile.verification_status ?? "incomplete";
  const profileIncomplete = !profile.business_name?.trim() || !profile.business_type?.trim() || !profile.country?.trim() || !profile.business_category?.trim() || !profile.email?.trim() || !profile.phone?.trim();
  const activeCount = tasks.filter((task) => task.status === "active").length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const pausedCount = tasks.filter((task) => task.status === "paused").length;

  const indicators = [
    { label: "Tarefas criadas", value: loadError ? "—" : String(tasks.length), description: "Total de tarefas da tua conta", icon: ClipboardList },
    { label: "Ativas e publicadas", value: loadError ? "—" : String(activeCount), description: "Tarefas atualmente ativas", icon: Activity },
    { label: "Concluídas", value: loadError ? "—" : String(completedCount), description: "Tarefas marcadas como concluídas", icon: CheckCircle2 },
    { label: "Pausadas", value: loadError ? "—" : String(pausedCount), description: "Tarefas temporariamente pausadas", icon: Clock3 },
    { label: "Em análise", value: "—", description: "Fluxo de análise de tarefas empresariais ainda não disponível", icon: History },
    { label: "Rejeitadas ou canceladas", value: "—", description: "Estados empresariais de rejeição/cancelamento ainda não disponíveis", icon: ShieldAlert },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BriefcaseBusiness className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA</p><p className="truncate text-sm font-semibold">Área empresarial</p></div></div>
          <Button variant="outline" size="sm" className="shrink-0 lg:hidden" aria-expanded={menuOpen} aria-controls="business-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X className="mr-2 h-4 w-4" /> : <Menu className="mr-2 h-4 w-4" />}{menuOpen ? "Fechar menu" : "Menu"}</Button>
          <Button variant="ghost" size="sm" onClick={() => void signOut()} disabled={signingOut} className="hidden sm:inline-flex">{signingOut ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}{signingOut ? "A terminar..." : "Terminar sessão"}</Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside id="business-navigation" className={(menuOpen ? "block" : "hidden") + " rounded-2xl border border-border bg-card p-3 lg:block lg:self-start"}>
            <div className="mb-3 px-3 py-2"><p className="truncate text-sm font-semibold">{displayName}</p><p className="truncate text-xs text-muted-foreground">{authEmail ?? "Conta empresarial"}</p></div>
            <nav aria-label="Menu empresarial" className="space-y-5">
              {navGroups.map((group) => <section key={group.title}><h2 className="mb-2 px-3 text-[10px] font-bold tracking-widest text-muted-foreground">{group.title}</h2><div className="space-y-1">{group.items.map((item) => {
                const Icon = item.icon;
                const cls = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors " + (item.available ? "text-foreground hover:bg-muted" : "cursor-not-allowed text-muted-foreground opacity-70");
                return item.available && item.to
                  ? <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className={cls} activeProps={{ className: "bg-primary/10 font-semibold text-primary" }}><Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span></Link>
                  : <button key={item.label} type="button" className={cls} aria-disabled="true" title={item.detail}><Icon className="h-4 w-4 shrink-0" /><span className="flex-1">{item.label}</span><LockKeyhole className="h-3.5 w-3.5 shrink-0" /></button>;
              })}</div></section>)}
            </nav>
            <div className="mt-4 border-t border-border pt-3 lg:hidden"><Button variant="outline" className="w-full justify-start" onClick={() => void signOut()} disabled={signingOut}>{signingOut ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}{signingOut ? "A terminar..." : "Terminar sessão"}</Button></div>
          </aside>
          <div className="min-w-0 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BriefcaseBusiness className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA · PAINEL EMPRESARIAL</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Olá, {displayName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Aqui está o resumo da atividade da tua conta.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadDashboard()} disabled={loading} className="shrink-0 self-start sm:self-auto">
            {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Atualizar dados
          </Button>
        </header>

        {profileIncomplete && <section className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold">Completa o teu perfil empresarial</p><p className="mt-1 text-sm text-muted-foreground">Faltam informações obrigatórias. Preenche os dados para poderes solicitar a verificação quando estiver disponível.</p></div>
          <Link to="/client/profile" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Completar perfil</Link>
        </section>}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"><ShieldAlert className="h-5 w-5 text-muted-foreground" /></span>
              <div>
                <p className="text-sm text-muted-foreground">Estado do perfil empresarial</p>
                <span className={"mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold " + (statusStyles[verificationStatus] ?? "bg-muted text-foreground")}>{statusLabels[verificationStatus] ?? "Incompleto"}</span>
              </div>
            </div>
            <Link to="/client/profile" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Ver perfil empresarial <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {verificationStatus !== "verified" && <p className="mt-3 text-sm leading-5 text-muted-foreground">Completa o perfil e solicita a verificação. A aprovação não é automática e a criação de tarefas remuneradas permanece indisponível nesta etapa.</p>}
        </section>

        {loadError && <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /><p>{loadError}</p></div>
          <Button variant="outline" onClick={() => void loadDashboard()} disabled={loading}>Tentar novamente</Button>
        </section>}

        <section>
          <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Resumo da atividade</h2><p className="text-sm text-muted-foreground">Indicadores baseados nos registos existentes.</p></div></div>
          {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40" />)}</div>
          : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{indicators.map((item) => <article key={item.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{item.value}</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"><item.icon className="h-4 w-4" /></span></div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </article>)}</div>}
          {!loading && !loadError && tasks.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Ainda não existem tarefas associadas às empresas desta conta.</p>}
          {!loading && !loadError && <p className="mt-3 text-xs text-muted-foreground">Saldo empresarial e orçamento utilizado não são apresentados porque o painel financeiro empresarial ainda não está disponível. Nenhum valor financeiro foi estimado.</p>}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Atividade recente</h2><p className="mt-1 text-sm text-muted-foreground">Eventos e registos reais da tua conta.</p></div><History className="h-5 w-5 text-muted-foreground" /></div>
            {loading ? <div className="space-y-3">{[1,2,3].map((n) => <div key={n} className="h-14 animate-pulse rounded-xl bg-muted/40" />)}</div>
              : recent.length === 0 ? <div className="rounded-xl bg-muted/30 px-4 py-7 text-center"><History className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Sem atividade recente</p><p className="mt-1 text-xs text-muted-foreground">Quando existirem registos, serão apresentados aqui.</p></div>
              : <ol className="divide-y divide-border">{recent.map((item) => <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted"><Activity className="h-4 w-4 text-muted-foreground" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-0.5 break-words text-sm text-muted-foreground">{item.detail}</p><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span>{taskStatusLabels[item.status] ?? item.status}</span><span>·</span><time>{dateTime(item.date)}</time></div></div></li>)}</ol>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4"><h2 className="font-semibold">Participações</h2><p className="mt-1 text-sm text-muted-foreground">Submissões registadas nas tuas tarefas.</p></div>
            {loading ? <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
              : !participationAvailable ? <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">Os dados de participação não estão disponíveis neste momento.</p>
              : <div className="rounded-xl bg-muted/30 p-4"><p className="text-3xl font-bold tabular-nums">{participations ?? 0}</p><p className="mt-1 text-sm text-muted-foreground">Participações registadas</p></div>}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Os resultados detalhados e a gestão de participações estarão disponíveis quando o respetivo módulo empresarial for implementado.</p>
          </div>
        </section>

        <section>
          <div className="mb-3"><h2 className="text-lg font-semibold">Acessos rápidos</h2><p className="text-sm text-muted-foreground">Abre as áreas disponíveis ou consulta o estado dos módulos planeados.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{quickLinks.map((item) => {
            const body = <div className={"flex h-full items-start gap-3 rounded-2xl border border-border bg-card p-4 " + (item.available ? "transition-colors hover:border-primary/40" : "opacity-75")}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><item.icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.label}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p><span className={"mt-3 inline-flex items-center gap-1 text-xs font-semibold " + (item.available ? "text-primary" : "text-muted-foreground")}>{item.available ? <>Abrir área <ArrowRight className="h-3 w-3" /></> : <><LockKeyhole className="h-3 w-3" />Ainda indisponível</>}</span></div>
            </div>;
            return item.available && item.to ? <Link key={item.label} to={item.to}>{body}</Link> : <div key={item.label} aria-disabled="true">{body}</div>;
          })}</div>
        </section>
        <footer className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">Os indicadores refletem apenas dados acessíveis à conta autenticada. Tarefas remuneradas, campanhas, carteira empresarial e estatísticas avançadas dependem de etapas posteriores.</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
