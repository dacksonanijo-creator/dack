import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  FileText,
  Globe2,
  HelpCircle,
  Info,
  KeyRound,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Definições — Taskora" },
      { name: "description", content: "Idioma, tema, segurança e informações legais da tua conta Taskora." },
      { property: "og:title", content: "Definições — Taskora" },
      { property: "og:description", content: "Personaliza idioma, tema e segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const links = [
  { to: "/app/help", label: "Ajuda", icon: HelpCircle },
  { to: "/about", label: "Sobre a Taskora", icon: Info },
  { to: "/terms", label: "Termos de utilização", icon: FileText },
  { to: "/privacy", label: "Política de privacidade", icon: ShieldCheck },
] as const;

function SettingsPage() {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState("pt");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Definições</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personaliza a tua experiência.</p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Globe2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Idioma</p>
            <p className="text-xs text-muted-foreground">Escolhe o idioma da interface</p>
          </div>
          <div className="flex shrink-0 gap-1 rounded-full bg-muted p-1">
            {[
              { id: "pt", label: "PT" },
              { id: "en", label: "EN" },
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => setLang(o.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                  lang === o.id ? "bg-card text-primary shadow-soft" : "text-muted-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-border p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Tema {dark ? "escuro" : "claro"}</p>
            <p className="text-xs text-muted-foreground">Alterna entre claro e escuro</p>
          </div>
          <button
            role="switch"
            aria-checked={dark}
            onClick={() => setDark((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              dark ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-card shadow-soft transition-all",
                dark ? "left-6" : "left-1",
              )}
            />
          </button>
        </div>

        <button className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/60">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Alterar palavra-passe</p>
            <p className="text-xs text-muted-foreground">Atualiza as tuas credenciais</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </section>

      <section className="divide-y divide-border overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/60">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
              <l.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold">{l.label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </section>

      <p className="text-center text-xs text-muted-foreground">Taskora · versão 1.0.0</p>
    </div>
  );
}
