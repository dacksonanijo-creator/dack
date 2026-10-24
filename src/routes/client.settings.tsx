import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, BadgeCheck, Bell, Globe2, LogOut, Monitor, Moon, Settings,
  ShieldAlert, Sun, User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { useTheme, type ThemePreference } from "@/hooks/use-theme";
import { LanguageSelect } from "@/components/taskora/language-select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client/settings")({
  head: () => ({
    meta: [
      { title: "Definições — Taskora" },
      { name: "description", content: "Preferências da tua conta de empresa: aparência, idioma e sessão." },
      { property: "og:title", content: "Definições — Taskora" },
      { property: "og:description", content: "Preferências da tua conta de empresa: aparência, idioma e sessão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientSettingsPage,
});

const statusLabels: Record<string, string> = {
  not_started: "Incompleto", incomplete: "Incompleto", pending: "Pendente de verificação",
  verified: "Verificado", rejected: "Rejeitado", corrections_required: "Correções necessárias",
  suspended: "Suspenso",
};

const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function ClientSettingsPage() {
  const { profile } = Route.useRouteContext();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { preference, setPreference } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const displayName = profile.business_name?.trim() || profile.full_name?.trim() || "Cliente";
  const verificationStatus = profile.verification_status ?? "incomplete";

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/client" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao resumo</Link>
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Settings className="h-5 w-5" /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA · PAINEL EMPRESARIAL</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Definições</h1>
          <p className="mt-1 text-sm text-muted-foreground">Preferências da tua conta de empresa.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Conta</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Nome comercial</dt><dd className="min-w-0 text-right font-medium break-words">{displayName}</dd></div>
          <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Email de acesso</dt><dd className="min-w-0 text-right font-medium break-words">{profile.email ?? "—"}</dd></div>
          <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Tipo de conta</dt><dd className="font-medium">Empresa / cliente</dd></div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Estado de verificação</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              {verificationStatus === "verified" ? <BadgeCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
              {statusLabels[verificationStatus] ?? "Incompleto"}
            </dd>
          </div>
        </dl>
        <Link to="/client/profile" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"><User className="h-4 w-4" /> Editar perfil empresarial</Link>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Aparência</h2>
        <p className="mt-1 text-sm text-muted-foreground">Escolhe o tema da interface.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const active = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPreference(option.value)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                  active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Idioma</h2>
        <p className="mt-1 text-sm text-muted-foreground">O idioma fica guardado na tua conta.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><Globe2 className="h-4 w-4 text-muted-foreground" /><LanguageSelect variant="full" /></div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Notificações</h2>
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <p>As preferências de notificações empresariais ficarão disponíveis quando o módulo de notificações da conta de empresa for activado.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Sessão</h2>
        <p className="mt-1 text-sm text-muted-foreground">Termina a sessão neste dispositivo.</p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "A terminar sessão…" : "Terminar sessão"}
        </button>
      </section>

      <p className="text-xs leading-5 text-muted-foreground">Mais definições (2FA, PIN de segurança, preferências de dados) serão adicionadas em etapas posteriores.</p>
      {preference === "system" && <span className="hidden">{toast}</span>}
    </div>
  );
}
