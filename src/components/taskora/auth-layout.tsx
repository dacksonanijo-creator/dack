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
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to={backTo}
        className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border/80 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:left-6 sm:top-6"
        aria-label={t("auth.back")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="w-full max-w-[440px]">
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="px-6 pb-7 pt-9 sm:px-8 sm:pt-10">
            <div className="mb-7 flex justify-center">
              <TaskoraMark className="h-11 w-11" />
            </div>
            <div className="text-center">
              <h1 className="font-display text-[26px] font-extrabold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="px-6 pb-7 sm:px-8 sm:pb-8">{children}</div>

          <div className="flex items-center justify-center gap-2 border-t border-border/70 bg-muted/25 px-6 py-4">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("auth.trustBadge")}
            </span>
          </div>
        </div>

        {footer && (
          <div className="mt-5 px-3 text-center text-sm text-muted-foreground">{footer}</div>
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
      <span className="ml-0.5 block text-[13px] font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
