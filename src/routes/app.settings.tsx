import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lang, setLang] = useState<"pt" | "en">("pt");
  const [density, setDensity] = useState<"cozy" | "compact">("cozy");
  const [notifications, setNotifications] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="space-y-6 bg-background">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Definições</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Gere a tua conta e as preferências da aplicação.</p>
      </div>

      <Section title="Conta">
        <Row icon={KeyRound} label="Alterar palavra-passe" desc="Atualiza as tuas credenciais de acesso" />
        <Row icon={ShieldCheck} label="Gestão de segurança" desc="Verificação e proteção da conta" />
        <Row
          icon={Laptop}
          label="Sessões ativas"
          desc="Dispositivos com sessão iniciada"
          right={
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Em breve
            </span>
          }
        />
      </Section>

      <Section title="Notificações">
        <Row
          icon={Bell}
          label="Notificações da aplicação"
          desc="Receber avisos dentro da Taskora"
          right={<Toggle on={notifications} onChange={setNotifications} label="Notificações da aplicação" />}
        />
        <Row
          icon={BellRing}
          label="Alertas de tarefas"
          desc="Novas tarefas e resultados de submissões"
          right={
            <Toggle
              on={notifications && taskAlerts}
              onChange={(v) => setTaskAlerts(v)}
              label="Alertas de tarefas"
            />
          }
        />
        <Row
          icon={FileText}
          label="Resumo por email"
          desc="Um resumo semanal da tua atividade"
          right={<Toggle on={emailAlerts} onChange={setEmailAlerts} label="Resumo por email" />}
        />
      </Section>

      <Section title="Aparência">
        <Row
          icon={theme === "dark" ? Moon : Sun}
          label="Tema"
          desc="Claro ou escuro"
          right={
            <SegBar
              value={theme}
              onChange={setTheme}
              options={[
                { id: "light", label: "Claro" },
                { id: "dark", label: "Escuro" },
              ]}
            />
          }
        />
        <Row
          icon={Type}
          label="Densidade"
          desc="Espaçamento dos conteúdos"
          right={
            <SegBar
              value={density}
              onChange={setDensity}
              options={[
                { id: "cozy", label: "Normal" },
                { id: "compact", label: "Compacto" },
              ]}
            />
          }
        />
      </Section>

      <Section title="Idioma">
        <Row
          icon={Globe2}
          label="Idioma da aplicação"
          desc={lang === "pt" ? "Português" : "English"}
          right={
            <SegBar
              value={lang}
              onChange={setLang}
              options={[
                { id: "pt", label: "PT" },
                { id: "en", label: "EN" },
              ]}
            />
          }
        />
      </Section>

      <Section title="Privacidade">
        <Row icon={ShieldCheck} label="Política de privacidade" desc="Como tratamos os teus dados" to="/privacy" />
        <Row icon={FileText} label="Termos de utilização" desc="Regras da plataforma" to="/terms" />
        <Row icon={Database} label="Controlo de dados" desc="Exportar ou eliminar a tua informação" />
      </Section>

      <p className="pb-2 text-center text-xs text-muted-foreground">Taskora · versão 1.0.0</p>
    </div>
  );
}
