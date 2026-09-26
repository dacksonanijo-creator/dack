import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora — Oportunidades que avançam contigo" },
      {
        name: "description",
        content: "Nexora — uma experiência simples, moderna e preparada para o teu próximo passo.",
      },
    ],
  }),
  component: NexoraIntro,
});

function NexoraIntro() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-hero px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <Link
          to="/welcome"
          aria-label="Entrar na Nexora"
          className="group relative rounded-[2rem] outline-none transition-transform duration-300 hover:scale-[1.04] focus-visible:ring-4 focus-visible:ring-primary/25"
        >
          <span className="absolute -inset-6 rounded-[2.5rem] bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-80" />
          <span className="relative grid h-32 w-32 place-items-center rounded-[2rem] border border-white/70 bg-card/90 shadow-glow backdrop-blur-xl sm:h-36 sm:w-36">
            <span className="font-display text-6xl font-black tracking-[-0.08em] text-gradient sm:text-7xl">
              N
            </span>
          </span>
        </Link>

        <Link
          to="/welcome"
          className="mt-7 rounded-xl px-4 py-2 font-display text-3xl font-extrabold tracking-[-0.04em] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:text-4xl"
        >
          N<span className="text-gradient">exora</span>
        </Link>

        <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground sm:text-base">
          O teu próximo passo começa aqui.
        </p>

        <Link
          to="/welcome"
          className="mt-9 inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-primary px-7 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
        >
          Entrar
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/60">
          Simples • Moderno • Feito para ti
        </p>
      </div>
    </main>
  );
}
