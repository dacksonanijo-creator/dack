import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useLocale, useT } from "@/i18n";
import { LanguageSelect } from "@/components/taskora/language-select";

import {
  Bell,
  BellRing,
  ChevronRight,
  Database,
  FileText,
  Globe2,
  KeyRound,
  Laptop,
  Moon,
  ShieldCheck,
  Sun,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Definições — Taskora" },
      { name: "description", content: "Gere conta, notificações, aparência, idioma e privacidade na Taskora." },
      { property: "og:title", content: "Definições — Taskora" },
      { property: "og:description", content: "Personaliza conta, notificações, aparência, idioma e privacidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  desc,
  right,
  to,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  desc?: string;
  right?: React.ReactNode;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {desc ? <span className="block truncate text-xs text-muted-foreground">{desc}</span> : null}
      </span>
      {right ?? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  );

  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50";

  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  if (right && !onClick) {
    return <div className={cls}>{inner}</div>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}
    >
      <span
        className={cn(
          "absolute top-1 h-4 w-4 rounded-full bg-card shadow-soft transition-all",
          on ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

function SegBar<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex shrink-0 gap-0.5 rounded-full bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
            value === o.id ? "bg-card text-primary shadow-soft" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SettingsPage() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const { locale, locales } = useLocale();
  const currentLanguageLabel = locales.find((l) => l.code === locale)?.label ?? locale;
  const [density, setDensity] = useState<"cozy" | "compact">("cozy");
  const [notifications, setNotifications] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);


  return (
    <div className="space-y-6 bg-background">
      <div>
        <h1 className="font-display text-2xl font-extrabold">{t("settings.title")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Section title={t("settings.account")}>
        <Row icon={KeyRound} label={t("settings.changePassword")} desc={t("settings.changePasswordDesc")} />
        <Row icon={ShieldCheck} label={t("settings.security")} desc={t("settings.securityDesc")} />
        <Row
          icon={Laptop}
          label={t("settings.activeSessions")}
          desc={t("settings.activeSessionsDesc")}
          right={
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("common.soon")}
            </span>
          }
        />
      </Section>

      <Section title={t("settings.notifications")}>
        <Row
          icon={Bell}
          label={t("settings.appNotifications")}
          desc={t("settings.appNotificationsDesc")}
          right={<Toggle on={notifications} onChange={setNotifications} label={t("settings.appNotifications")} />}
        />
        <Row
          icon={BellRing}
          label={t("settings.taskAlerts")}
          desc={t("settings.taskAlertsDesc")}
          right={
            <Toggle
              on={notifications && taskAlerts}
              onChange={(v) => setTaskAlerts(v)}
              label={t("settings.taskAlerts")}
            />
          }
        />
        <Row
          icon={FileText}
          label={t("settings.emailDigest")}
          desc={t("settings.emailDigestDesc")}
          right={<Toggle on={emailAlerts} onChange={setEmailAlerts} label={t("settings.emailDigest")} />}
        />
      </Section>

      <Section title={t("settings.appearance")}>
        <Row
          icon={theme === "dark" ? Moon : Sun}
          label={t("settings.theme")}
          desc={t("settings.themeDesc")}
          right={
            <SegBar
              value={theme}
              onChange={setTheme}
              options={[
                { id: "light", label: t("settings.themeLight") },
                { id: "dark", label: t("settings.themeDark") },
              ]}
            />
          }
        />
        <Row
          icon={Type}
          label={t("settings.density")}
          desc={t("settings.densityDesc")}
          right={
            <SegBar
              value={density}
              onChange={setDensity}
              options={[
                { id: "cozy", label: t("settings.densityCozy") },
                { id: "compact", label: t("settings.densityCompact") },
              ]}
            />
          }
        />
      </Section>

      <Section title={t("settings.language")}>
        <Row
          icon={Globe2}
          label={t("language.title")}
          desc={currentLanguageLabel}
          right={<LanguageSelect variant="compact" />}
        />
      </Section>

      <Section title={t("settings.privacy")}>
        <Row icon={ShieldCheck} label={t("settings.privacyPolicy")} desc={t("settings.privacyPolicyDesc")} to="/privacy" />
        <Row icon={FileText} label={t("settings.terms")} desc={t("settings.termsDesc")} to="/terms" />
        <Row icon={Database} label={t("settings.dataControl")} desc={t("settings.dataControlDesc")} />
      </Section>

      <p className="pb-2 text-center text-xs text-muted-foreground">{t("settings.version")}</p>
    </div>
  );
}
