import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { user } from "@/components/taskora/mock-data";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Painel — Taskora" },
      {
        name: "description",
        content: "A tua página de entrada na Taskora: saudação personalizada e acesso à plataforma.",
      },
      { property: "og:title", content: "Painel — Taskora" },
      { property: "og:description", content: "A tua página de entrada na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function greetingFor(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 19) return "Boa tarde";
  return "Boa noite";
}

function Dashboard() {
  const [greeting, setGreeting] = useState("Olá");

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  const firstName = user.name.split(" ").slice(-1)[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <section className="animate-rise">
        <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
          {greeting}, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Bem-vindo à Taskora. Estamos felizes por ter você connosco.
        </p>
      </section>

      <section className="animate-rise relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-10 shadow-soft [animation-delay:80ms] sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-primary opacity-10 blur-2xl"
        />
        <div className="relative flex flex-col items-center text-center">
          <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-primary/30" />
            <Sparkles className="relative h-6 w-6" />
          </span>
          <h2 className="mt-5 font-display text-xl font-extrabold sm:text-2xl">
            A tua conta está pronta
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Transformamos tempo em oportunidades. Explora a Taskora e prepara-te para começar assim
            que as tarefas estiverem disponíveis.
          </p>
          <Link
            to="/app/tasks"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
          >
            Explorar a plataforma <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <p className="animate-rise text-center text-xs text-muted-foreground/80 [animation-delay:140ms]">
        Novas funcionalidades serão ativadas em breve na tua conta.
      </p>
    </div>
  );
}
