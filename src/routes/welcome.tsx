import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Timer, Wallet } from "lucide-react";
import { TaskoraLogo } from "@/components/taskora/logo";
import { LanguageSelect } from "@/components/taskora/language-select";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Bem-vindo à Taskora" },
      {
        name: "description",
        content:
          "Cria a tua conta Taskora e começa a realizar microtarefas remuneradas a partir do telemóvel.",
      },
      { property: "og:title", content: "Bem-vindo à Taskora" },
      {
        property: "og:description",
        content: "Microtarefas simples, recompensas claras e uma experiência premium.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const t = useT();

  const highlights = [
    {
      icon: Timer,
      title: t("welcome.highlight.shortTasks.title"),
      text: t("welcome.highlight.shortTasks.text"),
    },
    {
      icon: Wallet,
      title: t("welcome.highlight.clearReward.title"),
      text: t("welcome.highlight.clearReward.text"),
    },
    {
      icon: ShieldCheck,
      title: t("welcome.highlight.trust.title"),
      text: t("welcome.highlight.trust.text"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-hero px-5 py-8 sm:px-6">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <TaskoraLogo />
        <LanguageSelect variant="compact" />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-10">
        <span className="w-fit animate-rise rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          {t("welcome.badge")}
        </span>
        <h1 className="mt-5 animate-rise font-display text-4xl font-extrabold leading-[1.08] [animation-delay:80ms] sm:text-5xl">
          {t("welcome.title.prefix")}{" "}
          <span className="text-gradient">{t("welcome.title.highlight")}</span>{" "}
          {t("welcome.title.suffix")}
        </h1>
        <p className="mt-4 max-w-lg animate-rise text-base leading-relaxed text-muted-foreground [animation-delay:160ms]">
          {t("welcome.desc")}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {highlights.map((h, i) => (
            <div
              key={h.title}
              className="animate-rise rounded-2xl border border-border/70 bg-card p-4 shadow-soft"
              style={{ animationDelay: `${220 + i * 80}ms` }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <h.icon className="h-4.5 w-4.5" />
              </span>
              <p className="mt-3 font-display text-sm font-bold">{h.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{h.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 flex-1 rounded-xl text-base shadow-glow">
            <Link to="/signup">{t("welcome.createAccount")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 flex-1 rounded-xl text-base">
            <Link to="/login">{t("welcome.login")}</Link>
          </Button>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-2xl text-center text-xs text-muted-foreground">
        {t("welcome.terms.continue")}{" "}
        <Link to="/terms" className="text-primary hover:underline">
          {t("welcome.terms.terms")}
        </Link>{" "}
        {t("welcome.terms.and")}{" "}
        <Link to="/privacy" className="text-primary hover:underline">
          {t("welcome.terms.privacy")}
        </Link>
        .
      </footer>
    </div>
  );
}
