import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BarChart3, BriefcaseBusiness, CircleHelp, ClipboardList, CreditCard, FilePlus2, Settings2, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";

export const Route = createFileRoute("/client")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    if (isAdminEmail(data.user.email)) throw redirect({ to: "/admin" });
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles").select("account_type, full_name, business_name, verification_status").eq("id", data.user.id).maybeSingle();
    if (profileError || profile?.account_type !== "client") throw redirect({ to: "/app" });
    return { profile };
  },
  component: ClientDashboard,
});

const items = [
  { label: "Visão geral", description: "Resumo da conta empresarial", icon: BarChart3, active: true, to: "/client" },
  { label: "Minhas tarefas", description: "Consultar tarefas criadas", icon: ClipboardList, active: false },
  { label: "Criar tarefa", description: "Publicar uma nova tarefa", icon: FilePlus2, active: false },
  { label: "Carteira e orçamento", description: "Gestão de orçamento e pagamentos", icon: CreditCard, active: false },
  { label: "Participações e resultados", description: "Acompanhar participação e resultados", icon: Users, active: false },
  { label: "Estatísticas", description: "Indicadores e desempenho", icon: BarChart3, active: false },
  { label: "Perfil empresarial", description: "Dados do cliente e atividade", icon: Settings2, active: true, to: "/client/profile" },
  { label: "Ajuda", description: "Obter apoio para a conta", icon: CircleHelp, active: false },
];

const statusLabels: Record<string, string> = {
  not_started: "Incompleto", incomplete: "Incompleto", pending: "Pendente de verificação",
  verified: "Verificado", rejected: "Rejeitado", corrections_required: "Correções necessárias", suspended: "Suspenso",
};

function ClientDashboard() {
  const { profile } = Route.useRouteContext();
  const displayName = profile?.business_name || profile?.full_name || "Conta de cliente";
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BriefcaseBusiness className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA · ÁREA DO CLIENTE</p>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">{displayName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gere a presença e as atividades da tua conta empresarial.</p>
          </div>
        </header>
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base font-semibold">Estado da conta</h2><p className="mt-1 text-sm text-muted-foreground">{statusLabels[profile?.verification_status ?? "incomplete"] ?? "Incompleto"}</p></div>
            <Link to="/client/profile" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Completar perfil <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Preenche os dados empresariais e submete-os para análise. A verificação depende de aprovação administrativa. A publicação de tarefas remuneradas permanece indisponível nesta etapa.</p>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const content = <article className={"h-full rounded-2xl border border-border bg-card p-4 " + (item.active ? "shadow-sm transition-colors hover:border-primary/40" : "opacity-70")}>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><item.icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.label}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                  {!item.active && <span className="mt-3 inline-block rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Ainda indisponível</span>}
                  {item.active && <span className="mt-3 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">Abrir módulo</span>}
                </div>
              </div>
            </article>;
            return item.active && item.to ? <Link key={item.label} to={item.to}>{content}</Link> : <div key={item.label}>{content}</div>;
          })}
        </section>
      </div>
    </main>
  );
}
