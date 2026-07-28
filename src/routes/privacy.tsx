import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

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

const sections = [
  { t: "Dados que recolhemos", b: "Nome, nome de utilizador, email, país e informação relacionada com as tarefas que realizas." },
  { t: "Como usamos os dados", b: "Para criar a tua conta, recomendar tarefas relevantes e comunicar contigo sobre submissões." },
  { t: "Partilha", b: "Não vendemos dados pessoais. Partilhamos apenas o necessário com empresas parceiras para validar tarefas." },
  { t: "Segurança", b: "Utilizamos ligações encriptadas e boas práticas de segurança para proteger a tua informação." },
  { t: "Os teus direitos", b: "Podes aceder, corrigir ou eliminar os teus dados a qualquer momento através das definições da conta." },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-hero px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="font-display text-3xl font-extrabold">Política de privacidade</h1>
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
