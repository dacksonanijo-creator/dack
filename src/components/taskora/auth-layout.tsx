import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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
    <div className="relative flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10 sm:px-6">
      <Link
        to={backTo}
        className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground sm:left-6 sm:top-6"
        aria-label={t("auth.back")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="w-full max-w-[480px]">
        <div className="animate-rise overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {/* Cabeçalho */}
          <div className="px-8 pb-6 pt-10 text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-primary/5 p-2 ring-1 ring-border/60">
              <TaskoraMark className="h-12 w-12" />
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">{subtitle}</p>
          </div>

          {/* Formulário */}
          <div className="px-8 pb-10">{children}</div>

          {/* Selo de confiança */}
          <div className="flex items-center justify-center gap-2 border-t border-border/60 bg-muted/40 px-8 py-5">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("auth.trustBadge")}
            </span>
          </div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        )}
      </div>
    </div>
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
      <span className="ml-1 block text-[13px] font-semibold text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
