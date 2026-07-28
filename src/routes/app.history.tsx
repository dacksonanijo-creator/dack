import { createFileRoute } from "@tanstack/react-router";
import { history } from "@/components/taskora/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [
      { title: "Histórico — Taskora" },
      { name: "description", content: "Consulta o histórico das tuas microtarefas concluídas na Taskora." },
      { property: "og:title", content: "Histórico — Taskora" },
      { property: "og:description", content: "Todas as tuas submissões e o respetivo estado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

const tone: Record<string, string> = {
  Aprovada: "bg-accent text-money",
  "Em revisão": "bg-primary/10 text-primary",
  Rejeitada: "bg-destructive/10 text-destructive",
};

function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Histórico</h1>
        <p className="mt-1 text-sm text-muted-foreground">Todas as tuas submissões recentes.</p>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
        {history.map((h) => (
          <div key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold">{h.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{h.date}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="font-display text-sm font-extrabold text-money">{h.reward}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", tone[h.status])}>
                {h.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
