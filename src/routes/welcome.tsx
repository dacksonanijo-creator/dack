import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { TaskoraLogo } from "@/components/taskora/logo";
import { LanguageSelect } from "@/components/taskora/language-select";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "TASKORA" },
      {
        name: "description",
        content: "TASKORA — uma plataforma internacional para transformar tempo em oportunidades.",
      },
      { property: "og:title", content: "TASKORA" },
      {
        property: "og:description",
        content: "Uma plataforma internacional para transformar tempo em oportunidades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.10),transparent_30%),radial-gradient(circle_at_85%_15%,hsl(var(--primary)/0.06),transparent_24%)]"
      />

      <header className="relative z-10 mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <TaskoraLogo size="md" showWordmark />

        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Navegação principal">
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-10 sm:px-4"
          >
            Iniciar sessão
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background shadow-sm transition-transform hover:-translate-y-0.5 sm:h-10 sm:px-5"
          >
            Criar conta
          </Link>
          <LanguageSelect variant="compact" />
        </nav>
      </header>

      <main className="relative z-10 flex min-h-[calc(100svh-80px)] items-center justify-center px-5 pb-10 pt-4 sm:px-8 sm:pb-12">
        <section className="relative flex w-full max-w-5xl flex-col items-center justify-center text-center">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[min(72vw,34rem)] w-[min(72vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/50"
          />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[min(48vw,23rem)] w-[min(48vw,23rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10"
          />

          <div className="relative mb-8 grid h-14 w-14 place-items-center rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur sm:mb-10 sm:h-16 sm:w-16">
            <TaskoraLogo size="sm" showWordmark={false} />
          </div>

          <p className="relative text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:text-xs">
            TASKORA
          </p>

          <h1 className="relative mt-4 max-w-3xl font-display text-5xl font-extrabold leading-[0.98] tracking-[-0.045em] sm:mt-5 sm:text-7xl lg:text-8xl">
            O teu tempo.
            <br />
            <span className="text-gradient">As tuas oportunidades.</span>
          </h1>

          <p className="relative mt-6 text-sm font-medium text-muted-foreground sm:text-base">
            Uma plataforma feita para o mundo.
          </p>

          <Link
            to="/signup"
            className="group relative mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-lg sm:mt-10 sm:h-13 sm:px-7"
          >
            Começar agora
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
