import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AtSign,
  CalendarDays,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  Smartphone,
  User as UserIcon,
} from "lucide-react";
import { Avatar } from "@/components/taskora/app-shell";
import { user } from "@/components/taskora/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Perfil — Taskora" },
      { name: "description", content: "Consulta e edita os dados da tua conta Taskora." },
      { property: "og:title", content: "Perfil — Taskora" },
      { property: "og:description", content: "Dados pessoais, contactos e segurança da conta." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

const personal = [
  { icon: UserIcon, label: "Nome completo", value: user.name },
  { icon: AtSign, label: "Nome de utilizador", value: user.username },
  { icon: Mail, label: "Email", value: user.email },
  { icon: Phone, label: "Número de telefone", value: "+258 84 000 0000" },
  { icon: CalendarDays, label: "Data de registo", value: user.joined },
];

const security = [
  { icon: KeyRound, label: "Palavra-passe", hint: "Alterar palavra-passe" },
  { icon: Smartphone, label: "Sessões e dispositivos", hint: "Gerir acesso à conta" },
];

function Profile() {
  return (
    <div className="space-y-5">
      {/* Identificação */}
      <section className="animate-rise flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <Avatar className="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold leading-tight">{user.name}</h1>
          <p className="truncate text-xs text-muted-foreground">{user.username}</p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-money">
            <ShieldCheck className="h-3 w-3" /> Conta ativa
          </span>
        </div>
        <Button asChild size="sm" variant="outline" className="h-8 shrink-0 rounded-lg px-3 text-xs">
          <Link to="/app/settings">
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Link>
        </Button>
      </section>

      {/* Informações pessoais */}
      <section>
        <h2 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Informações pessoais
        </h2>
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          {personal.map((r) => (
            <div key={r.label} className="flex items-center gap-3 px-4 py-3">
              <r.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="flex-1 text-xs text-muted-foreground">{r.label}</p>
              <p className="max-w-[55%] truncate text-right text-sm font-semibold">{r.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Segurança */}
      <section>
        <h2 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Segurança
        </h2>
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          {security.map((s) => (
            <Link
              key={s.label}
              to="/app/settings"
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{s.hint}</p>
              </div>
              <span className="text-xs text-muted-foreground">›</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
