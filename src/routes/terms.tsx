import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de utilização — Taskora" },
      { name: "description", content: "Condições de utilização da plataforma Taskora." },
      { property: "og:title", content: "Termos de utilização — Taskora" },
      { property: "og:description", content: "Regras e condições de uso da Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Terms,
});

const sections = [
  {
    t: "1. Aceitação",
    b: "Ao criar uma conta na Taskora concordas com estas condições de utilização e com a nossa política de privacidade.",
  },
  {
    t: "2. Conta e elegibilidade",
    b: "Deves ter pelo menos 18 anos e fornecer informação verdadeira. Cada pessoa pode manter apenas uma conta ativa.",
  },
  {
    t: "3. Realização de tarefas",
    b: "As tarefas devem ser concluídas seguindo as instruções indicadas. Submissões incompletas ou fraudulentas podem ser rejeitadas.",
  },
  {
    t: "4. Recompensas",
    b: "Os valores apresentados são indicativos da recompensa por tarefa e ficam disponíveis após revisão e aprovação.",
  },
  {
    t: "5. Encerramento",
    b: "Podes encerrar a tua conta a qualquer momento. Podemos suspender contas que violem estas regras.",
  },
];

function Terms() {
  return (
    <div className="min-h-screen bg-gradient-hero px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="font-display text-3xl font-extrabold">Termos de utilização</h1>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Atualizado em julho de 2026</p>
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
