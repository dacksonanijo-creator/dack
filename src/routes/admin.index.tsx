import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  Building2,
  CheckCircle2,
  ListChecks,
  PlayCircle,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo — Taskora" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Área restrita de gestão da plataforma Taskora.",
      },
    ],
  }),
  component: AdminDashboard,
});

const stats = [
  { label: "Total de utilizadores", value: "—", icon: Users, hint: "Contas registadas" },
  { label: "Total de empresas", value: "—", icon: Building2, hint: "Anunciantes ativos" },
  { label: "Total de tarefas", value: "—", icon: ListChecks, hint: "Criadas na plataforma" },
  { label: "Tarefas ativas", value: "—", icon: PlayCircle, hint: "Disponíveis agora" },
  { label: "Tarefas concluídas", value: "—", icon: CheckCircle2, hint: "Submissões aprovadas" },
  { label: "Receita da plataforma", value: "—", icon: TrendingUp, hint: "Comissões acumuladas" },
  { label: "Valor pago aos utilizadores", value: "—", icon: Wallet, hint: "Saques liquidados" },
  { label: "Saques pendentes", value: "—", icon: Banknote, hint: "A aguardar aprovação" },
];

function AdminDashboard() {
  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Visão geral da Taskora. Os indicadores serão ligados aos dados reais numa próxima fase."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/70 bg-background p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-background p-4">
          <p className="text-sm font-semibold text-foreground">Estatísticas gerais</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Gráficos de crescimento, retenção e volume financeiro serão apresentados aqui.
          </p>
          <div className="mt-4 grid h-40 place-items-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
            Área reservada para gráficos
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-background p-4">
          <p className="text-sm font-semibold text-foreground">Actividade recente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registos de aprovações, submissões e movimentos financeiros.
          </p>
          <div className="mt-4 grid h-40 place-items-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
            Sem dados nesta fase
          </div>
        </div>
      </div>
    </div>
  );
}
