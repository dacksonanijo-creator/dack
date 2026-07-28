import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [
      { title: "Histórico — Taskora" },
      { name: "description", content: "Consulta o histórico das tuas microtarefas na Taskora." },
      { property: "og:title", content: "Histórico — Taskora" },
      { property: "og:description", content: "Todas as tuas submissões e o respetivo estado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Histórico</h1>
      <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <History className="h-5 w-5" />
        </span>
        <p className="mt-4 font-display text-base font-bold">Sem histórico ainda</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          As tarefas que concluíres vão aparecer aqui.
        </p>
      </div>
    </div>
  );
}
