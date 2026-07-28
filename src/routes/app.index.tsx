import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  CircleHelp,
  ListChecks,
  Settings,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Painel — Taskora" },
      { name: "description", content: "O teu painel Taskora: atalhos rápidos e primeiros passos na plataforma." },
      { property: "og:title", content: "Painel — Taskora" },
      { property: "og:description", content: "Atalhos rápidos e primeiros passos na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const shortcuts = [
  { to: "/app/tasks", label: "Tarefas", icon: ListChecks },
  { to: "/app/wallet", label: "Carteira", icon: Wallet },
  { to: "/app/withdrawals", label: "Saques", icon: Banknote },
  { to: "/app/profile", label: "Perfil", icon: User },
  { to: "/app/settings", label: "Definições", icon: Settings },
  { to: "/app/help", label: "Ajuda", icon: CircleHelp },
] as const;

function Dashboard() {
  return (
    <div className="space-y-8">
      <section className="animate-rise grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card px-2 py-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <s.icon className="h-4.5 w-4.5" />
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight">{s.label}</span>
          </Link>
        ))}
      </section>

      <section className="animate-rise grid place-items-center rounded-3xl border border-border/70 bg-card px-6 py-14 text-center shadow-soft [animation-delay:80ms]">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold">Bem-vindo à Taskora!</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          A tua conta foi criada com sucesso. Explora a plataforma e começa a realizar tarefas quando
          estiverem disponíveis.
        </p>
        <Link
          to="/app/tasks"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Explorar Tarefas <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
