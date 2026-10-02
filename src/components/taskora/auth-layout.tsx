import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { TaskoraMark } from "./logo";
import { useT } from "@/i18n";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  backTo = "/welcome",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  backTo?: string;
}) {
  const t = useT();

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(59,91,219,0.07),transparent_28%),radial-gradient(circle_at_88%_92%,rgba(16,185,129,0.05),transparent_25%)]" />

      <Link
        to={backTo}
        className="absolute left-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-white/90 text-muted-foreground shadow-sm backdrop-blur transition hover:border-primary/20 hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:left-6 sm:top-6"
        aria-label={t("auth.back")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.75fr)] lg:gap-16 lg:px-10 lg:py-12">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-3">
              <TaskoraMark forceNative className="h-12 w-12" />
              <div>
                <p className="font-display text-xl font-extrabold tracking-tight">Taskora</p>
                <p className="text-xs font-medium text-muted-foreground">Conectar e ganhar</p>
              </div>
            </div>

            <div className="max-w-lg">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/[0.06] px-3 py-1.5 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Uma experiência simples e segura
              </div>
              <h2 className="font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] text-foreground xl:text-5xl">
                A tua conta Taskora,
                <span className="block text-primary">sempre contigo.</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                Acede à plataforma com uma experiência rápida, clara e preparada para crescer contigo.
              </p>
            </div>

            <div className="mt-10 flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white shadow-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </span>
              Autenticação protegida e sessão persistente
            </div>
          </div>
        </section>

        <section className="w-full max-w-[440px] justify-self-center lg:justify-self-end">
          <div className="rounded-[26px] border border-border/80 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.09)] sm:p-7">
            <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
              <TaskoraMark forceNative className="h-11 w-11 text-primary" />
              <div className="text-left">
                <p className="font-display text-xl font-extrabold tracking-tight text-foreground">Taskora</p>
                <p className="text-xs font-medium text-muted-foreground">Connect & Earn</p>
              </div>
            </div>

            <div className="text-center">
              <h1 className="font-display text-[25px] font-extrabold tracking-[-0.025em] text-foreground sm:text-[27px]">
                {title}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5.5 text-muted-foreground">
                {subtitle}
              </p>
            </div>

            <div className="mt-7">{children}</div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 px-2 text-center">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("auth.trustBadge")}
            </span>
          </div>

          {footer && (
            <div className="mt-5 px-3 text-center text-sm text-muted-foreground">{footer}</div>
          )}
        </section>
      </div>
    </main>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="ml-0.5 block text-[12px] font-semibold tracking-[0.01em] text-foreground">{label}</span>
      {children}
    </label>
  );
}
