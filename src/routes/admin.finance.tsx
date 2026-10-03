import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Percent, WalletCards } from "lucide-react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Gestão financeira interna do TASKORA." },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Financeiro"
        description="Ledger interno, regras de distribuição, obrigações dos utilizadores e receita da plataforma."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/admin/finance/distribution"
          className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Percent className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <h2 className="mt-4 font-semibold">Regras de distribuição</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Definir apenas a percentagem TASKORA. A parte do utilizador é calculada automaticamente para completar 100%.
          </p>
        </Link>

        <Link
          to="/admin/wallet"
          className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <WalletCards className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <h2 className="mt-4 font-semibold">Carteira TASKORA</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Receita, valores pendentes, obrigações dos utilizadores, reservas, pagamentos e reconciliação.
          </p>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        Os valores financeiros apresentados são provenientes do ledger. Nenhum saldo fictício é criado nesta área.
      </div>
    </div>
  );
}
