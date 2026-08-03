import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useLocale, useT } from "@/i18n";
import { LanguageSelect } from "@/components/taskora/language-select";

import {
  BadgeCheck,
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock,
  FileText,
  Globe2,
  Info,
  LifeBuoy,
  Lightbulb,
  Mail,
  Megaphone,
  Monitor,
  Moon,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sun,
  TriangleAlert,
  Wallet,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Definições — Taskora" },
      { name: "description", content: "Central de preferências: idioma, tema, segurança, notificações, privacidade e suporte." },
      { property: "og:title", content: "Definições — Taskora" },
      { property: "og:description", content: "Personaliza preferências, segurança, notificações e privacidade na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p> : null}
      </div>
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
        {children}
      </div>
    </section>
  );
}

function SoonBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
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
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex shrink-0 gap-0.5 rounded-full bg-muted p-0.5">
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
  const { preference, setPreference } = useTheme();
  const { locale, locales } = useLocale();
  const currentLanguageLabel = locales.find((l) => l.code === locale)?.label ?? locale;

  const [dateFormat, setDateFormat] = useState<"dmy" | "mdy">("dmy");
  const [timeFormat, setTimeFormat] = useState<"h24" | "h12">("h24");
  const [autoTimezone, setAutoTimezone] = useState(true);
  const deviceTimezone =
    typeof Intl !== "undefined" ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC") : "UTC";

  const [notif, setNotif] = useState({
    platform: true,
    email: false,
    newTasks: true,
    approved: true,
    rejected: true,
    payments: true,
    campaigns: false,
  });
  const setFlag = (key: keyof typeof notif) => (v: boolean) => setNotif((s) => ({ ...s, [key]: v }));

  return (
    <div className="space-y-6 bg-background pb-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">{t("settings.title")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("settings.pref.subtitle")}</p>
      </div>

      {/* Preferências */}
      <Section title={t("settings.pref.section")}>
        <Row
          icon={Globe2}
          label={t("language.title")}
          desc={currentLanguageLabel}
          right={<LanguageSelect variant="compact" />}
        />
        <Row
          icon={preference === "dark" ? Moon : preference === "system" ? Monitor : Sun}
          label={t("settings.theme")}
          desc={t("settings.pref.themeDesc")}
          right={
            <SegBar
              ariaLabel={t("settings.theme")}
              value={preference}
              onChange={setPreference}
              options={[
                { id: "light", label: t("settings.themeLight") },
                { id: "dark", label: t("settings.themeDark") },
                { id: "system", label: t("settings.pref.themeSystem") },
              ]}
            />
          }
        />
        <Row
          icon={CalendarClock}
          label={t("settings.pref.dateFormat")}
          desc={t("settings.pref.dateFormatDesc")}
          right={
            <SegBar
              ariaLabel={t("settings.pref.dateFormat")}
              value={dateFormat}
              onChange={setDateFormat}
              options={[
                { id: "dmy", label: "DD/MM" },
                { id: "mdy", label: "MM/DD" },
              ]}
            />
          }
        />
        <Row
          icon={Clock}
          label={t("settings.pref.timeFormat")}
          desc={t("settings.pref.timeFormatDesc")}
          right={
            <SegBar
              ariaLabel={t("settings.pref.timeFormat")}
              value={timeFormat}
              onChange={setTimeFormat}
              options={[
                { id: "h24", label: "24h" },
                { id: "h12", label: "12h" },
              ]}
            />
          }
        />
        <Row
          icon={Globe2}
          label={t("settings.pref.timezone")}
          desc={autoTimezone ? t("settings.pref.timezoneAuto", { zone: deviceTimezone }) : deviceTimezone}
          right={
            <Toggle on={autoTimezone} onChange={setAutoTimezone} label={t("settings.pref.timezone")} />
          }
        />
      </Section>

      {/* Segurança */}
      <Section title={t("settings.security")}>
        <Row
          icon={ShieldCheck}
          label={t("security.title")}
          desc={t("security.entryDesc")}
          to="/app/security"
        />
      </Section>

      {/* Notificações */}
      <Section title={t("settings.notifications")}>
        <Row
          icon={Bell}
          label={t("settings.appNotifications")}
          desc={t("settings.appNotificationsDesc")}
          right={<Toggle on={notif.platform} onChange={setFlag("platform")} label={t("settings.appNotifications")} />}
        />
        <Row
          icon={Mail}
          label={t("settings.notif.email")}
          desc={t("settings.notif.emailDesc")}
          right={<Toggle on={notif.email} onChange={setFlag("email")} label={t("settings.notif.email")} />}
        />
        <Row
          icon={BellRing}
          label={t("settings.notif.newTasks")}
          desc={t("settings.notif.newTasksDesc")}
          right={<Toggle on={notif.newTasks} onChange={setFlag("newTasks")} label={t("settings.notif.newTasks")} />}
        />
        <Row
          icon={CheckCircle2}
          label={t("settings.notif.approved")}
          desc={t("settings.notif.approvedDesc")}
          right={<Toggle on={notif.approved} onChange={setFlag("approved")} label={t("settings.notif.approved")} />}
        />
        <Row
          icon={XCircle}
          label={t("settings.notif.rejected")}
          desc={t("settings.notif.rejectedDesc")}
          right={<Toggle on={notif.rejected} onChange={setFlag("rejected")} label={t("settings.notif.rejected")} />}
        />
        <Row
          icon={Wallet}
          label={t("settings.notif.payments")}
          desc={t("settings.notif.paymentsDesc")}
          right={<Toggle on={notif.payments} onChange={setFlag("payments")} label={t("settings.notif.payments")} />}
        />
        <Row
          icon={Megaphone}
          label={t("settings.notif.campaigns")}
          desc={t("settings.notif.campaignsDesc")}
          right={<Toggle on={notif.campaigns} onChange={setFlag("campaigns")} label={t("settings.notif.campaigns")} />}
        />
      </Section>

      {/* Privacidade */}
      <Section title={t("settings.privacy")}>
        <Row icon={ShieldCheck} label={t("settings.privacyPolicy")} desc={t("settings.privacyPolicyDesc")} to="/privacy" />
        <Row icon={FileText} label={t("settings.terms")} desc={t("settings.termsDesc")} to="/terms" />
        <Row
          icon={BadgeCheck}
          label={t("settings.privacy.consents")}
          desc={t("settings.privacy.consentsDesc")}
          right={<SoonBadge label={t("common.soon")} />}
        />
      </Section>

      {/* Ajuda e Suporte */}
      <Section title={t("settings.help.section")}>
        <Row icon={CircleHelp} label={t("settings.help.center")} desc={t("settings.help.centerDesc")} to="/app/help" />
        <Row
          icon={LifeBuoy}
          label={t("settings.help.contact")}
          desc={t("settings.help.contactDesc")}
          right={<SoonBadge label={t("common.soon")} />}
        />
        <Row
          icon={TriangleAlert}
          label={t("settings.help.report")}
          desc={t("settings.help.reportDesc")}
          right={<SoonBadge label={t("common.soon")} />}
        />
        <Row
          icon={Lightbulb}
          label={t("settings.help.suggest")}
          desc={t("settings.help.suggestDesc")}
          right={<SoonBadge label={t("common.soon")} />}
        />
      </Section>

      {/* Sobre */}
      <Section title={t("settings.about.section")}>
        <Row icon={Info} label={t("settings.about.app")} desc={t("settings.about.appDesc")} to="/about" />
        <Row
          icon={BadgeCheck}
          label={t("settings.about.version")}
          desc="1.0.0"
          right={<span className="shrink-0 text-xs font-semibold text-muted-foreground">1.0.0</span>}
        />
        <Row
          icon={Scale}
          label={t("settings.about.licenses")}
          desc={t("settings.about.licensesDesc")}
          right={<SoonBadge label={t("common.soon")} />}
        />
        <Row
          icon={RefreshCw}
          label={t("settings.about.updates")}
          desc={t("settings.about.updatesDesc")}
          right={<SoonBadge label={t("common.soon")} />}
        />
      </Section>

      <p className="pb-2 text-center text-xs text-muted-foreground">{t("settings.version")}</p>
    </div>
  );
}
