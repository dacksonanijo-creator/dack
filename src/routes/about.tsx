import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TaskoraLogo } from "@/components/taskora/logo";

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
  return (
    <div className="min-h-screen bg-gradient-hero px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <TaskoraLogo size="lg" />
        <h1 className="font-display text-3xl font-extrabold">Transformando tempo em oportunidades.</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A Taskora nasceu com uma ideia simples: o tempo livre das pessoas pode gerar valor real. Ligamos
          empresas que precisam de pequenas ações — testes, inquéritos, recolha de dados — a uma comunidade
          que quer trabalhar de forma flexível, a partir do telemóvel.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Construímos uma experiência clara, rápida e transparente: sabes sempre quanto vale uma tarefa,
          quanto tempo demora e em que estado está a tua submissão.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { k: "Comunidade", v: "12k+" },
            { k: "Tarefas concluídas", v: "84k+" },
            { k: "Países", v: "7" },
          ].map((s) => (
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
