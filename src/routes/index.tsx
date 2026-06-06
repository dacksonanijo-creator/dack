import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, UserPlus, ListChecks, Wallet, Users, BarChart3 } from "lucide-react";
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

      {/* 1. HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 md:py-28">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
              <Link to="/auth" search={{ mode: "signup" }}>
                {t("hero.cta.primary")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <a href="#how" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {t("hero.cta.secondary")}
            </a>
          </div>
        </div>
      </section>

      {/* 2. COMO FUNCIONA */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle title={t("how.title")} subtitle={t("how.subtitle")} />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <StepCard step="01" icon={<UserPlus />} title={t("how.s1.title")} desc={t("how.s1.desc")} />
          <StepCard step="02" icon={<ListChecks />} title={t("how.s2.title")} desc={t("how.s2.desc")} />
          <StepCard step="03" icon={<Wallet />} title={t("how.s3.title")} desc={t("how.s3.desc")} />
        </div>
      </section>

      {/* 3. VANTAGENS */}
      <section id="users" className="border-y border-border/50 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{t("nav.users")}</span>
            <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{t("users.title")}</h3>
            <ul className="mt-5 space-y-3">
              {[t("users.b1"), t("users.b2"), t("users.b3"), t("users.b4")].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div id="companies">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{t("nav.companies")}</span>
            <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{t("companies.title")}</h3>
            <ul className="mt-5 space-y-3">
              {[t("companies.b1"), t("companies.b2"), t("companies.b3"), t("companies.b4")].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. ESTATÍSTICAS */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          <Stat icon={<Users className="h-5 w-5" />} value="10k+" label={t("hero.stats.users")} />
          <Stat icon={<ListChecks className="h-5 w-5" />} value="58k+" label={t("hero.stats.tasks")} />
          <Stat icon={<BarChart3 className="h-5 w-5" />} value="2.4M MZN" label={t("hero.stats.paid")} />
        </div>
      </section>

      {/* 5. CTA FINAL */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-hero p-10 text-center shadow-glow sm:p-14">
          <h3 className="relative font-display text-3xl font-bold sm:text-4xl">
            Pronto para começar?
          </h3>
          <Button asChild size="lg" className="relative mt-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
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
    <Card className="relative overflow-hidden border-border/50 bg-card/50 p-6 shadow-card transition-all hover:border-primary/40">
      <div className="absolute right-4 top-3 font-display text-5xl font-bold text-primary/15">{step}</div>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</div>
      <div className="font-display text-2xl font-bold sm:text-3xl">{value}</div>
      <div className="text-xs text-muted-foreground sm:text-sm">{label}</div>
    </div>
  );
}

// Keep imports referenced
void Rocket; void Coins;
