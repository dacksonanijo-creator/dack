import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { TaskoraMark } from "@/components/taskora/logo";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";
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
    let active = true;

    const restoreSession = async () => {
      try {
        // Validate the persisted Supabase session before deciding where to land.
        // Supabase handles refresh-token renewal through the configured auth client.
        const { data } = await supabase.auth.getUser();
        if (!active) return;

        if (data.user) {
          if (isAdminEmail(data.user.email)) {
            await navigate({ to: "/admin", replace: true });
          } else {
            await navigate({ to: "/app", replace: true });
          }
          return;
        }
      } catch {
        // No valid session: continue to the public welcome screen.
      }

      if (active) {
        const timer = setTimeout(() => {
          if (active) void navigate({ to: "/welcome", replace: true });
        }, 900);
        return () => clearTimeout(timer);
      }

      return undefined;
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero px-6">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-primary/30" />
          <TaskoraMark className="h-20 w-20 animate-rise" />
        </div>
        <h1 className="mt-6 animate-rise font-display text-4xl font-extrabold tracking-tight [animation-delay:120ms]">
          Taskora
        </h1>
        <p className="mt-2 animate-rise text-sm text-muted-foreground [animation-delay:260ms] sm:text-base">
          {t("brand.tagline")}
        </p>
        <div className="mt-10 h-1 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[taskora-rise_1.6s_ease-in-out_infinite_alternate] rounded-full bg-gradient-primary" />
        </div>
      </div>
    </div>
  );
}