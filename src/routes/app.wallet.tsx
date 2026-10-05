import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Clock3, History, Search, WalletCards } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/wallet")({
  head: () => ({
    meta: [
      { title: "Carteira — Taskora" },
      { name: "description", content: "Acompanha saldo disponível, pendente, reservado e ganhos reais da tua carteira Taskora." },
      { property: "og:title", content: "Carteira — Taskora" },
      { property: "og:description", content: "Resumo financeiro e movimentos internos da tua conta Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

type MovementStatus = "PENDING" | "CONFIRMED" | "AVAILABLE" | "RESERVED" | "PAID" | "FAILED" | "REVERSED" | "CANCELLED";
type FilterKey = "all" | "earning" | "pending" | "done";

interface Movement {
  id: string;
  kind: "earning";
  amount: number;
  currency: string;
  reference: string;
  created_at: string;
  status: MovementStatus;
}

interface WalletSummary {
  currency: string;
  available: number;
  pending: number;
  reserved: number;
  total_earned: number;
}

function WalletPage() {
  const t = useT();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const client = supabase as any;
    const [summaryResult, movementsResult] = await Promise.all([
      client.rpc("get_my_financial_wallet"),
      client.rpc("get_my_financial_wallet_movements", { p_limit: 50 }),
    ]);

    if (summaryResult.error || movementsResult.error) {
      setError(summaryResult.error?.message || movementsResult.error?.message || "Não foi possível carregar a carteira.");
      setWallet(null);
      setMovements([]);
    } else {
      const summary = Array.isArray(summaryResult.data) ? summaryResult.data[0] ?? null : summaryResult.data ?? null;
      setWallet(summary);
      setMovements(Array.isArray(movementsResult.data) ? movementsResult.data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const kindLabel = t("wallet.kind.earning");
  const statusLabel = (status: MovementStatus) => {
    const labels: Record<MovementStatus, string> = {
      PENDING: "Pendente",
      CONFIRMED: "Confirmada",
      AVAILABLE: "Disponível",
      RESERVED: "Reservada",
      PAID: "Paga",
      FAILED: "Falhou",
      REVERSED: "Revertida",
      CANCELLED: "Cancelada",
    };
    return labels[status];
  };

  const matches = (movement: Movement, current: FilterKey) => {
    if (current === "all" || current === "earning") return true;
    if (current === "pending") return ["PENDING", "CONFIRMED"].includes(movement.status);
    return ["AVAILABLE", "PAID"].includes(movement.status);
  };

  const list = movements.filter(
    (movement) =>
      matches(movement, filter) &&
      (kindLabel.toLowerCase().includes(query.trim().toLowerCase()) ||
        movement.reference.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const money = (amount: number) =>
    new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const summary = wallet
    ? [
        {
          label: t("wallet.summary.available"),
          value: wallet.available,
          icon: WalletCards,
          tone: "text-task-accent",
        },
        {
          label: t("wallet.summary.pending"),
          value: wallet.pending,
          icon: Clock3,
          tone: "text-warning",
        },
        {
          label: "Reservado",
          value: wallet.reserved,
          icon: ArrowUpRight,
          tone: "text-task-muted",
        },
        {
          label: t("wallet.summary.totalEarnings"),
          value: wallet.total_earned,
          icon: ArrowDownToLine,
          tone: "text-task-accent",
        },
      ]
    : [];

  return (
    <div className="-mx-4 -my-4 min-h-full bg-task-bg px-4 py-4 sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h1 className="font-display text-base font-bold text-task-title">{t("wallet.title")}</h1>
            <p className="mt-0.5 text-[10px] text-task-muted">Resumo financeiro da tua conta Taskora</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="text-[11px] font-medium text-task-muted hover:text-task-title disabled:opacity-50">
            {loading ? "A actualizar…" : "Actualizar"}
          </button>
        </div>

        {error && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">{error}</p>}

        <section className="rounded-xl border border-task-border bg-task-card p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-task-muted">Saldo disponível</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-task-title">
                {wallet ? money(wallet.available) : "—"}
                <span className="ml-1 text-xs font-semibold text-task-muted">{wallet?.currency ?? "MZN"}</span>
              </p>
            </div>
            <div className="rounded-lg border border-task-border bg-task-bg p-2.5 text-task-accent">
              <WalletCards className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/app/withdrawals"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-task-accent px-3 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Levantar
            </Link>
            <Link
              to="/app/history"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-task-border bg-task-bg px-3 text-[11px] font-semibold text-task-title transition-colors hover:border-task-accent/40"
            >
              <History className="h-3.5 w-3.5" />
              Histórico
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summary.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-task-border bg-task-card px-3 py-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-task-muted">{item.label}</p>
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", item.tone)} />
                </div>
                <p className="mt-1 font-display text-[15px] font-bold text-task-title">
                  {money(item.value)} <span className="text-[9px] font-medium text-task-muted">{wallet?.currency ?? "MZN"}</span>
                </p>
              </div>
            );
          })}
        </section>

        {!loading && !wallet && (
          <p className="text-[11px] text-task-muted">Ainda não existem movimentos financeiros no ledger.</p>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-task-title">Movimentos</h2>
            <span className="text-[10px] text-task-muted">{list.length} registo{list.length === 1 ? "" : "s"}</span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-task-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("wallet.search.placeholder")}
              className="w-full rounded-md border border-task-border bg-task-card py-1.5 pl-8 pr-3 text-[13px] text-task-title outline-none transition-colors placeholder:text-task-muted focus:border-task-accent/60"
            />
          </div>

          <div className="-mx-4 flex gap-4 overflow-x-auto border-b border-task-border px-4 sm:mx-0 sm:px-0">
            {[
              { key: "all" as const, label: t("wallet.filter.all") },
              { key: "earning" as const, label: t("wallet.filter.earning") },
              { key: "pending" as const, label: t("wallet.filter.pending") },
              { key: "done" as const, label: t("wallet.filter.done") },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 border-b-2 pb-2 text-[12px] font-medium transition-colors",
                  filter === f.key ? "border-task-accent text-task-title" : "border-transparent text-task-muted hover:text-task-title",
                )}
              >
                {f.label}
                <span className="ml-1 text-[10px] opacity-60">{movements.filter((m) => matches(m, f.key)).length}</span>
              </button>
            ))}
          </div>
        </section>

        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-task-border px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-task-title">{t("wallet.empty.title")}</p>
            <p className="mt-1 text-[11px] text-task-muted">{t("wallet.empty.desc")}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((movement) => (
              <article key={movement.id} className="rounded-lg border border-task-border bg-task-card px-3 py-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-task-title">{kindLabel}</span>
                  <span className="shrink-0 text-[10px] text-task-muted">
                    {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(movement.created_at))}
                  </span>
                </div>
                <p className="mt-1 font-display text-[15px] font-bold text-task-accent">
                  {money(Number(movement.amount))} {movement.currency}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px] font-medium",
                    movement.status === "REVERSED" || movement.status === "FAILED" || movement.status === "CANCELLED"
                      ? "text-destructive"
                      : movement.status === "AVAILABLE" || movement.status === "PAID"
                        ? "text-task-accent"
                        : "text-warning",
                  )}
                >
                  {statusLabel(movement.status)}
                </p>
                <p className="mt-1 truncate text-[10px] text-task-muted">Conversão: {movement.reference}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
