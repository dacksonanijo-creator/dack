import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  Fingerprint,
  History,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { useT } from "@/i18n";

export const Route = createFileRoute("/app/security")({
  head: () => ({
    meta: [
      { title: "Segurança — Taskora" },
      { name: "description", content: "Palavra-passe, email, telemóvel, 2FA, sessões ativas e dispositivos da tua conta Taskora." },
      { property: "og:title", content: "Segurança — Taskora" },
      { property: "og:description", content: "Gere a proteção da tua conta Taskora num só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
        {children}
      </div>
    </section>
  );
}

function Item({
  icon: Icon,
  label,
  desc,
  soon,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  soon: string;
}) {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-3 text-left">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{desc}</span>
      </span>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {soon}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </div>
  );
}

function SecurityPage() {
  const t = useT();
  const soon = t("common.soon");

  return (
    <div className="space-y-6 bg-background pb-4">
      <div className="space-y-2">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t("settings.title")}
        </Link>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">{t("security.title")}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("security.subtitle")}</p>
          </div>
        </div>
      </div>

      <Group title={t("security.access")}>
        <Item icon={KeyRound} label={t("security.password")} desc={t("security.passwordDesc")} soon={soon} />
        <Item icon={Mail} label={t("security.email")} desc={t("security.emailDesc")} soon={soon} />
        <Item icon={Smartphone} label={t("security.phone")} desc={t("security.phoneDesc")} soon={soon} />
        <Item icon={Fingerprint} label={t("security.twoFactor")} desc={t("security.twoFactorDesc")} soon={soon} />
      </Group>

      <Group title={t("security.sessions")}>
        <Item icon={Laptop} label={t("security.activeSessions")} desc={t("security.activeSessionsDesc")} soon={soon} />
        <Item icon={Smartphone} label={t("security.devices")} desc={t("security.devicesDesc")} soon={soon} />
        <Item icon={History} label={t("security.loginHistory")} desc={t("security.loginHistoryDesc")} soon={soon} />
        <Item icon={LogOut} label={t("security.endSessions")} desc={t("security.endSessionsDesc")} soon={soon} />
      </Group>

      <Group title={t("security.finance")}>
        <Item icon={KeyRound} label={t("security.pin")} desc={t("security.pinDesc")} soon={soon} />
      </Group>

      <p className="px-1 text-center text-xs text-muted-foreground">{t("security.note")}</p>
    </div>
  );
}
