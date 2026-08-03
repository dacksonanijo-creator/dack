import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TaskoraLogo } from "@/components/taskora/logo";
import { useT } from "@/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre a Taskora" },
      {
        name: "description",
        content: "A Taskora liga pessoas e empresas através de microtarefas remuneradas, simples e transparentes.",
      },
      { property: "og:title", content: "Sobre a Taskora" },
      { property: "og:description", content: "A nossa missão: transformar tempo em oportunidades." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  const t = useT();
  const stats = [
    { k: t("pages.about.statCommunity"), v: "12k+" },
    { k: t("pages.about.statTasks"), v: "84k+" },
    { k: t("pages.about.statCountries"), v: "7" },
  ];
  return (
    <div className="min-h-screen bg-gradient-hero px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("pages.about.back")}
        </Link>
        <TaskoraLogo size="lg" />
        <h1 className="font-display text-3xl font-extrabold">{t("pages.about.heading")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("pages.about.p1")}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("pages.about.p2")}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.k} className="rounded-2xl border border-border/70 bg-card p-4 text-center shadow-soft">
              <p className="font-display text-xl font-extrabold text-gradient">{s.v}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{s.k}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
