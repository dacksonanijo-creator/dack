import { createFileRoute } from "@tanstack/react-router";
import { Banknote } from "lucide-react";

export const Route = createFileRoute("/app/withdrawals")({
  head: () => ({
    meta: [
      { title: "Saques — Taskora" },
      { name: "description", content: "Pede levantamentos dos teus ganhos Taskora quando tiveres saldo disponível." },
      { property: "og:title", content: "Saques — Taskora" },
      { property: "og:description", content: "Levantamentos dos teus ganhos na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WithdrawalsPage,
});

function WithdrawalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Saques</h1>
      <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Banknote className="h-5 w-5" />
        </span>
        <p className="mt-4 font-display text-base font-bold">Sem saques por agora</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Poderás pedir um levantamento assim que tiveres saldo disponível.
        </p>
      </div>
    </div>
  );
}
