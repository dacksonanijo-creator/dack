import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, UserPlus, ListChecks, Wallet, Users, BarChart3, Briefcase, User as UserIcon } from "lucide-react";
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

      {/* HERO compacto */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {t("hero.tag")}
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            {t("hero.subtitle")}
          </p>

          <div className="mx-auto mt-6 grid max-w-xs grid-cols-1 gap-2">
            <Button asChild size="default" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
              <Link to="/auth" search={{ mode: "signup", role: "user" }}>
                <UserIcon className="mr-1 h-4 w-4" /> {t("hero.role.user")}
              </Link>
            </Button>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            <Link to="/auth" search={{ mode: "login" }} className="hover:text-foreground hover:underline">
              {t("hero.cta.secondary")} →
            </Link>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="how" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
        <SectionTitle title={t("how.title")} subtitle={t("how.subtitle")} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StepCard step="01" icon={<UserPlus className="h-5 w-5" />} title={t("how.s1.title")} desc={t("how.s1.desc")} />
          <StepCard step="02" icon={<ListChecks className="h-5 w-5" />} title={t("how.s2.title")} desc={t("how.s2.desc")} />
          <StepCard step="03" icon={<Wallet className="h-5 w-5" />} title={t("how.s3.title")} desc={t("how.s3.desc")} />
        </div>
      </section>

      {/* VANTAGENS */}
      <section id="users" className="border-y border-border/50 bg-card/30">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{t("nav.users")}</span>
            <h3 className="mt-1 font-display text-xl font-bold sm:text-2xl">{t("users.title")}</h3>
            <ul className="mt-4 space-y-2">
              {[t("users.b1"), t("users.b2"), t("users.b3"), t("users.b4")].map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div id="companies">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{t("nav.companies")}</span>
            <h3 className="mt-1 font-display text-xl font-bold sm:text-2xl">{t("companies.title")}</h3>
            <ul className="mt-4 space-y-2">
              {[t("companies.b1"), t("companies.b2"), t("companies.b3"), t("companies.b4")].map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ESTATÍSTICAS — parte de baixo */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-3 gap-4 rounded-2xl border border-border/50 bg-card/40 p-6 text-center">
          <Stat icon={<Users className="h-4 w-4" />} value="10k+" label={t("hero.stats.users")} />
          <Stat icon={<ListChecks className="h-4 w-4" />} value="58k+" label={t("hero.stats.tasks")} />
          <Stat icon={<BarChart3 className="h-4 w-4" />} value="2.4M" label={t("hero.stats.paid")} />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StepCard({ icon, step, title, desc }: { icon: React.ReactNode; step: string; title: string; desc: string }) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/50 p-5 transition-all hover:border-primary/40">
      <div className="absolute right-3 top-2 font-display text-3xl font-bold text-primary/15">{step}</div>
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</div>
      <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">{icon}</div>
      <div className="font-display text-xl font-bold sm:text-2xl">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
