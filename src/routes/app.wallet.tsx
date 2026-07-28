import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/app/wallet")({
  head: () => ({
    meta: [
      { title: "Carteira — Taskora" },
      { name: "description", content: "A tua carteira Taskora: acompanha o saldo quando começares a realizar tarefas." },
      { property: "og:title", content: "Carteira — Taskora" },
      { property: "og:description", content: "Acompanha o teu saldo na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Carteira</h1>
      <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" />
        </span>
        <p className="mt-4 font-display text-base font-bold">Ainda sem movimentos</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          A tua carteira ficará ativa assim que concluíres a primeira tarefa.
        </p>
      </div>
    </div>
  );
}
