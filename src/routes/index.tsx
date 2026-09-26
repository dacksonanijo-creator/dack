import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { TaskoraMark } from "@/components/taskora/logo";
import { useT } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taskora — Transformando tempo em oportunidades" },
      {
        name: "description",
        content:
          "Taskora é a plataforma de microtarefas remuneradas que transforma o teu tempo livre em oportunidades reais.",
      },
      { property: "og:title", content: "Taskora — Transformando tempo em oportunidades" },
      {
        property: "og:description",
        content: "Microtarefas simples, pagamentos rápidos e uma experiência pensada para o teu telemóvel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const t = useT();

  useEffect(() => {
    const timer = setTimeout(() => navigate({ to: "/welcome" }), 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-gradient-hero px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center justify-center text-center">
        <div className="relative">
          <span className="absolute -inset-5 animate-pulse-ring rounded-[2rem] bg-primary/15" />
          <div className="relative grid h-24 w-24 place-items-center rounded-[2rem] border border-white/60 bg-card/90 shadow-glow backdrop-blur">
            <TaskoraMark className="h-16 w-16 animate-rise" />
          </div>
        </div>

        <div className="mt-7 flex items-center gap-2 animate-rise [animation-delay:100ms]">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Plataforma de oportunidades
          </span>
        </div>

        <h1 className="mt-3 animate-rise font-display text-4xl font-extrabold tracking-tight [animation-delay:160ms] sm:text-5xl">
          Taskora
        </h1>

        <p className="mt-2 max-w-sm animate-rise text-sm leading-relaxed text-muted-foreground [animation-delay:240ms] sm:text-base">
          {t("brand.tagline")}
        </p>

        <div className="mt-9 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          A preparar a tua experiência
          <ArrowRight className="h-3.5 w-3.5" />
        </div>

        <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-muted/80">
          <div className="h-full w-1/3 animate-[taskora-rise_1.6s_ease-in-out_infinite_alternate] rounded-full bg-gradient-primary" />
        </div>
      </div>

      <div className="absolute bottom-7 left-0 right-0 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
        Simples • Seguro • Feito para o teu telemóvel
      </div>
    </div>
  );
}
