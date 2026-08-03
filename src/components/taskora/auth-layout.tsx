import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TaskoraLogo } from "./logo";
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
    <div className="flex min-h-screen flex-col bg-gradient-hero px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link
          to={backTo}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("auth.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <TaskoraLogo size="sm" />
        <span className="w-9" />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <div className="animate-rise rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-extrabold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
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
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
