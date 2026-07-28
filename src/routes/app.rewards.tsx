import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/app/rewards")({
  head: () => ({
    meta: [
      { title: "Recompensas — Taskora" },
      { name: "description", content: "Recompensas e bónus disponíveis para utilizadores Taskora." },
      { property: "og:title", content: "Recompensas — Taskora" },
      { property: "og:description", content: "Recompensas e bónus na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Recompensas</h1>
      <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Gift className="h-5 w-5" />
        </span>
        <p className="mt-4 font-display text-base font-bold">Sem recompensas ainda</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          As recompensas ficarão disponíveis em breve.
        </p>
      </div>
    </div>
  );
}
