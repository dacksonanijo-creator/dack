import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Globe2, LogOut, Mail, Pencil, Settings, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/taskora/app-shell";
import { user } from "@/components/taskora/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Perfil — Taskora" },
      { name: "description", content: "Consulta e edita os dados da tua conta Taskora." },
      { property: "og:title", content: "Perfil — Taskora" },
      { property: "og:description", content: "Dados pessoais, país e estado da conta." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const rows = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: Globe2, label: "País", value: user.country },
    { icon: CalendarDays, label: "Data de registo", value: user.joined },
    { icon: ShieldCheck, label: "Estado da conta", value: user.status },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-rise flex flex-col items-center rounded-3xl border border-border/70 bg-card p-7 text-center shadow-card">
        <Avatar className="h-20 w-20 text-2xl" />
        <h1 className="mt-4 font-display text-xl font-extrabold">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.username}</p>
        <span className="mt-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-money">
          {user.status}
        </span>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <r.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.label}</p>
              <p className="truncate text-sm font-semibold">{r.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-12 rounded-xl">
          <Link to="/app/settings">
            <Pencil className="mr-2 h-4 w-4" /> Editar perfil
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 rounded-xl">
          <Link to="/app/settings">
            <Settings className="mr-2 h-4 w-4" /> Definições
          </Link>
        </Button>
      </div>

      <Button
        asChild
        variant="ghost"
        size="lg"
        className="h-12 w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Link to="/welcome">
          <LogOut className="mr-2 h-4 w-4" /> Terminar sessão
        </Link>
      </Button>
    </div>
  );
}
