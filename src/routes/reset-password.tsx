import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { useT } from "@/i18n";
import { passwordIsStrong, passwordPolicyRules } from "@/lib/password-policy";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova palavra-passe — Taskora" },
      { name: "description", content: "Define uma nova palavra-passe depois da verificação de segurança." },
    ],
  }),
  component: ResetPassword,
});

const input =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";


function ResetPassword() {
  const t = useT();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);\n  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    setUpgradeRequired(sessionStorage.getItem("taskora-password-upgrade-required") === "1");
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!passwordIsStrong(password)) {
      setError("A nova palavra-passe não cumpre todos os requisitos de segurança.");
      return;
    }
    if (password !== confirm) {
      setError(t("auth.reset.passwordsMismatch"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        const msg = t(authErrorMessage(err.message));
        setError(msg);
        toast.error(msg);
        return;
      }
      sessionStorage.removeItem("taskora-password-upgrade-required");
      toast.success("Palavra-passe atualizada com sucesso.");
      navigate({ to: "/app" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Nova palavra-passe"
      subtitle="Define uma palavra-passe forte depois de concluíres a verificação."
      backTo="/login"
      footer={<Link to="/login" className="font-semibold text-primary hover:underline">Voltar ao início de sessão</Link>}
    >
      {!ready ? (
        <>
          {upgradeRequired && <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-5 text-foreground">A tua palavra-passe anterior continua válida, mas precisa de ser atualizada para cumprir a nova política de segurança.</div>}
          <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
            Abre esta página através do link ou código de recuperação enviado para o teu contacto.
          </p>
        </>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Field label="Nova palavra-passe">
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className={input + " pr-11"} autoComplete="new-password" placeholder="••••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="mb-2 text-[11px] font-semibold text-foreground">Requisitos da palavra-passe</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {passwordPolicyRules((rule) => {
                const valid = rule.valid;
                return (
                  <div key={rule.key} className={"flex items-center gap-1.5 text-[11px] " + (valid ? "text-primary" : "text-muted-foreground")}>
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>{rule.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Field label="Confirmar nova palavra-passe">
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} className={input + " pr-11"} autoComplete="new-password" placeholder="••••••••••" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }} />
              <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={showConfirm ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}>
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs font-medium leading-5 text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-sm font-semibold">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar…</> : "Guardar nova palavra-passe"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
