import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/wallet")({
  head: () => ({
    meta: [
      { title: "Carteira — Taskora" },
      {
        name: "description",
        content: "Acompanha saldo disponível, pendente e ganhos totais na tua carteira Taskora.",
      },
      { property: "og:title", content: "Carteira — Taskora" },
      { property: "og:description", content: "Resumo financeiro e movimentos da tua conta Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

type MovementKind = "earning" | "adjustment" | "credit";
type MovementStatus = "done" | "pending" | "rejected";

interface Movement {
  id: string;
  kind: MovementKind;
  amount: string;
  date: string;
  status: MovementStatus;
}

const statusTone: Record<MovementStatus, string> = {
  done: "text-task-accent",
  pending: "text-warning",
  rejected: "text-destructive",
};

type FilterKey = "all" | "earning" | "pending" | "done";

const movements: Movement[] = [];

function matches(m: Movement, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "earning") return m.kind === "earning";
  return m.status === filter;
}

function WalletPage() {
  const t = useT();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const kindLabels: Record<MovementKind, string> = {
    earning: t("wallet.kind.earning"),
    adjustment: t("wallet.kind.adjustment"),
    credit: t("wallet.kind.credit"),
  };

  const statusLabels: Record<MovementStatus, string> = {
    done: t("wallet.status.done"),
    pending: t("wallet.status.pending"),
    rejected: t("wallet.status.rejected"),
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("wallet.filter.all") },
    { key: "earning", label: t("wallet.filter.earning") },
    { key: "pending", label: t("wallet.filter.pending") },
    { key: "done", label: t("wallet.filter.done") },
  ];

  const list = movements.filter(
    (m) =>
      matches(m, filter) &&
      kindLabels[m.kind].toLowerCase().includes(query.trim().toLowerCase()),
  );

  const summary = [
    { label: t("wallet.summary.available"), value: "—" },
    { label: t("wallet.summary.pending"), value: "—" },
    { label: t("wallet.summary.totalEarnings"), value: "—" },
  ];

  return (
    <div className="-mx-4 -my-4 min-h-full bg-task-bg px-4 py-4 sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-base font-bold text-task-title">{t("wallet.title")}</h1>
          <span className="text-[11px] text-task-muted">{t("wallet.movementsCount", { n: list.length })}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {summary.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-task-border bg-task-card px-3 py-2"
            >
              <p className="truncate text-[10px] uppercase tracking-wide text-task-muted">
                {s.label}
              </p>
              <p className="mt-0.5 font-display text-[15px] font-bold text-task-title">{s.value}</p>
            </div>
          ))}
        </div>

        {movements.length === 0 && (
          <p className="text-[11px] text-task-muted">{t("wallet.noEarningsYet")}</p>
        )}

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
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 border-b-2 pb-2 text-[12px] font-medium transition-colors",
                filter === f.key
                  ? "border-task-accent text-task-title"
                  : "border-transparent text-task-muted hover:text-task-title",
              )}
            >
              {f.label}
              <span className="ml-1 text-[10px] opacity-60">
                {movements.filter((m) => matches(m, f.key)).length}
              </span>
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-task-border px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-task-title">{t("wallet.empty.title")}</p>
            <p className="mt-1 text-[11px] text-task-muted">{t("wallet.empty.desc")}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((m) => (
              <article
                key={m.id}
                className="rounded-lg border border-task-border bg-task-card px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-task-title">{kindLabels[m.kind]}</span>
                  <span className="shrink-0 text-[10px] text-task-muted">{m.date}</span>
                </div>
                <p className="mt-1 font-display text-[15px] font-bold text-task-accent">{m.amount}</p>
                <p className={cn("mt-0.5 text-[11px] font-medium", statusTone[m.status])}>
                  {statusLabels[m.status]}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
