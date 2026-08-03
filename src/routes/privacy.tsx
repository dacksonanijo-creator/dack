import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — Taskora" },
      { name: "description", content: "Como a Taskora recolhe, utiliza e protege os teus dados pessoais." },
      { property: "og:title", content: "Política de privacidade — Taskora" },
      { property: "og:description", content: "Transparência total sobre o tratamento dos teus dados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const t = useT();
  const sections = [
    { t: t("pages.privacy.t1"), b: t("pages.privacy.b1") },
    { t: t("pages.privacy.t2"), b: t("pages.privacy.b2") },
    { t: t("pages.privacy.t3"), b: t("pages.privacy.b3") },
    { t: t("pages.privacy.t4"), b: t("pages.privacy.b4") },
    { t: t("pages.privacy.t5"), b: t("pages.privacy.b5") },
  ];
  return (
    <div className="min-h-screen bg-gradient-hero px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("pages.privacy.back")}
        </Link>
        <h1 className="font-display text-3xl font-extrabold">{t("pages.privacy.title")}</h1>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("pages.privacy.updated")}</p>
        <div className="space-y-4">
          {sections.map((s) => (
            <section key={s.t} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
              <h2 className="font-display text-base font-bold">{s.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.b}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
