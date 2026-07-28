import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/app/activity")({
  head: () => ({
    meta: [
      { title: "Atividade — Taskora" },
      { name: "description", content: "Acompanha a tua atividade recente na Taskora." },
      { property: "og:title", content: "Atividade — Taskora" },
      { property: "og:description", content: "A tua atividade recente na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Atividade</h1>
      <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Activity className="h-5 w-5" />
        </span>
        <p className="mt-4 font-display text-base font-bold">Sem atividade registada</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          A tua atividade na plataforma vai aparecer aqui.
        </p>
      </div>
    </div>
  );
}
