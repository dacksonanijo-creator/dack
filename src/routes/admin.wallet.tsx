import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, WalletCards } from "lucide-react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/wallet")({
  head: () => ({
    meta: [
      { title: "Carteira TASKORA — Admin" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Valores financeiros reais calculados a partir do ledger interno." },
    ],
  }),
  component: PlatformWalletPage,
});

type Wallet = {
  currency: string;
  operational_balance: number;
  pending_revenue: number;
  revenue: number;
  user_available_obligations: number;
  user_pending_obligations: number;
  user_reserved_obligations: number;
  paid_user_amount: number;
  reversed_amount: number;
};

type Reconciliation = { open_flags: number };

function PlatformWalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    const client = supabase as any;
    const [walletResult, reconciliationResult] = await Promise.all([
      client.rpc("get_taskora_financial_wallet"),
      client.rpc("get_taskora_financial_reconciliation"),
    ]);
    if (walletResult.error || reconciliationResult.error) {
      setError(walletResult.error?.message || reconciliationResult.error?.message || "Não foi possível carregar a carteira financeira.");
    } else {
      setWallet(Array.isArray(walletResult.data) ? walletResult.data[0] ?? null : walletResult.data ?? null);
      setReconciliation(Array.isArray(reconciliationResult.data) ? reconciliationResult.data[0] ?? null : reconciliationResult.data ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const money = (value: number | undefined) =>
    value == null ? "—" : new Intl.NumberFormat("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const cards = wallet ? [
    ["Saldo operacional", wallet.operational_balance],
    ["Receita TASKORA", wallet.revenue],
    ["Receita pendente", wallet.pending_revenue],
    ["Obrigações utilizadores", wallet.user_available_obligations],
    ["Obrigações pendentes", wallet.user_pending_obligations],
    ["Valores reservados", wallet.user_reserved_obligations],
    ["Valores pagos", wallet.paid_user_amount],
    ["Valores revertidos", wallet.reversed_amount],
  ] : [];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Carteira TASKORA"
        description="Visão financeira baseada exclusivamente nos lançamentos do ledger interno."
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Actualizar
          </button>
        }
      />

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <WalletCards className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Resumo do ledger</h2>
            <p className="text-xs text-muted-foreground">
              {loading ? "A carregar…" : wallet ? `Moeda: ${wallet.currency}` : "Sem lançamentos financeiros registados."}
            </p>
          </div>
        </div>

        {wallet ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(([label, value]) => (
              <div key={label as string} className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">{label as string}</p>
                <p className="mt-1 text-xl font-bold">{money(value as number)} <span className="text-xs font-medium text-muted-foreground">{wallet.currency}</span></p>
              </div>
            ))}
          </div>
        ) : !loading ? (
          <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Ainda não existem movimentos financeiros no ledger.
          </div>
        ) : null}
      </section>

      {reconciliation && reconciliation.open_flags > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
          Existem {reconciliation.open_flags} divergência(s) de reconciliação aberta(s). Nenhum valor é corrigido automaticamente.
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        O saldo dos utilizadores não é tratado como receita TASKORA. Reservas e pagamentos são registados separadamente e só uma confirmação real do backend/provedor pode finalizar um payout.
      </div>
    </div>
  );
}
