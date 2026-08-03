import { createFileRoute } from "@tanstack/react-router";
import { useT } from "@/i18n";

export const Route = createFileRoute("/app/help")({
  head: () => ({
    meta: [
      { title: "Ajuda — Taskora" },
      { name: "description", content: "Perguntas frequentes e apoio para utilizadores da Taskora." },
      { property: "og:title", content: "Ajuda — Taskora" },
      { property: "og:description", content: "Respostas rápidas às dúvidas mais comuns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Help,
});

function Help() {
  const t = useT();
  const faqs = [
    { q: t("pages.help.q1"), a: t("pages.help.a1") },
    { q: t("pages.help.q2"), a: t("pages.help.a2") },
    { q: t("pages.help.q3"), a: t("pages.help.a3") },
    { q: t("pages.help.q4"), a: t("pages.help.a4") },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">{t("pages.help.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("pages.help.subtitle")}</p>
      </div>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <summary className="cursor-pointer list-none font-display text-sm font-bold">{f.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
