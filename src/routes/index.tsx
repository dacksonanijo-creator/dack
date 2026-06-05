import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Coins, Rocket, ShieldCheck, Users, Wallet, Zap, BarChart3, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Zap className="h-3.5 w-3.5" /> {t("hero.tag")}
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              {t("hero.title").split(" ").slice(0, -2).join(" ")}{" "}
              <span className="text-gradient">{t("hero.title").split(" ").slice(-2).join(" ")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("hero.cta.primary")} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border bg-card/50">
                <Link to="/auth" search={{ mode: "login" }}>{t("hero.cta.secondary")}</Link>
              </Button>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-6 border-t border-border/50 pt-8">
              <Stat value="10k+" label={t("hero.stats.users")} />
              <Stat value="58k+" label={t("hero.stats.tasks")} />
              <Stat value="2.4M MZN" label={t("hero.stats.paid")} />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionTitle title={t("how.title")} subtitle={t("how.subtitle")} />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <StepCard icon={<Rocket />} step="01" title={t("how.s1.title")} desc={t("how.s1.desc")} />
          <StepCard icon={<Coins />} step="02" title={t("how.s2.title")} desc={t("how.s2.desc")} />
          <StepCard icon={<Wallet />} step="03" title={t("how.s3.title")} desc={t("how.s3.desc")} />
        </div>
      </section>

      {/* USERS */}
      <section id="users" className="border-y border-border/50 bg-card/30">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{t("nav.users")}</span>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{t("users.title")}</h2>
            <ul className="mt-6 space-y-3">
              {[t("users.b1"), t("users.b2"), t("users.b3"), t("users.b4")].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Link to="/auth" search={{ mode: "signup" }}>{t("hero.cta.primary")}</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureTile icon={<Wallet />} title={t("dash.wallet")} />
            <FeatureTile icon={<ShieldCheck />} title="Seguro" />
            <FeatureTile icon={<Globe2 />} title="Internacional" />
            <FeatureTile icon={<Zap />} title="Rápido" />
          </div>
        </div>
      </section>

      {/* COMPANIES */}
      <section id="companies" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="order-2 grid grid-cols-2 gap-4 md:order-1">
            <FeatureTile icon={<Users />} title="Audiência" />
            <FeatureTile icon={<BarChart3 />} title="Relatórios" />
            <FeatureTile icon={<Rocket />} title="Lançamento rápido" />
            <FeatureTile icon={<Coins />} title="Pague por tarefa" />
          </div>
          <div className="order-1 md:order-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">{t("nav.companies")}</span>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{t("companies.title")}</h2>
            <ul className="mt-6 space-y-3">
              {[t("companies.b1"), t("companies.b2"), t("companies.b3"), t("companies.b4")].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-hero p-10 text-center shadow-glow sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.72_0.17_162/0.25),transparent_60%)]" />
          <h3 className="relative font-display text-3xl font-bold sm:text-4xl">
            Pronto para começar?
          </h3>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
            Crie a sua conta gratuita e comece a ganhar hoje mesmo.
          </p>
          <Button asChild size="lg" className="relative mt-6 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/auth" search={{ mode: "signup" }}>
              {t("hero.cta.primary")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-bold text-foreground sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      <p className="mt-3 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StepCard({ icon, step, title, desc }: { icon: React.ReactNode; step: string; title: string; desc: string }) {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 p-6 shadow-card transition-all hover:border-primary/40 hover:shadow-glow">
      <div className="absolute right-4 top-4 font-display text-5xl font-bold text-primary/10">{step}</div>
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}

function FeatureTile({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Card className="flex flex-col items-start gap-3 border-border/50 bg-card/50 p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
    </Card>
  );
}
