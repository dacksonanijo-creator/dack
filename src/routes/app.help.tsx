import { createFileRoute } from "@tanstack/react-router";

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

const faqs = [
  {
    q: "Como escolho uma tarefa?",
    a: "Abre o separador Tarefas, filtra por categoria e toca em Ver detalhes para leres as instruções completas.",
  },
  {
    q: "Quanto tempo demora a revisão?",
    a: "Normalmente as submissões são revistas em menos de 48 horas úteis.",
  },
  {
    q: "Posso usar a Taskora no telemóvel?",
    a: "Sim. A interface foi desenhada primeiro para telemóvel e adapta-se a tablets e computadores.",
  },
  {
    q: "Como falo com o suporte?",
    a: "Escreve para apoio@taskora.app e respondemos em português dentro de 24 horas.",
  },
];

function Help() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Ajuda</h1>
        <p className="mt-1 text-sm text-muted-foreground">Perguntas frequentes sobre a plataforma.</p>
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
