import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { emailRe } from "@/lib/auth-errors";
import { useT } from "@/i18n";
import { useAdoptDomFormValues } from "@/hooks/use-form-hydration";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar palavra-passe — Taskora" },
      { name: "description", content: "Recupera o acesso à tua conta Taskora de forma segura." },
    ],
  }),
  component: Forgot,
});

const input =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";

function Forgot() {
  const t = useT();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useAdoptDomFormValues(formRef, (values) => {
    if (values.identifier) setIdentifier(values.identifier);
  });

  const normalizedPhone = identifier.replace(/[\s()-]/g, "");
  const validIdentifier =
    method === "email"
      ? emailRe.test(identifier.trim())
      : /^\+?[1-9]\d{7,14}$/.test(normalizedPhone);

  const sendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || verified) return;
    if (!validIdentifier) {
      setError(method === "email" ? "Introduz um email válido." : "Introduz um número de telefone válido em formato internacional.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (method === "email") {
        await supabase.auth.resetPasswordForEmail(identifier.trim().toLowerCase(), {
          redirectTo: window.location.origin + "/reset-password",
        });
      } else {
        await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
          options: { shouldCreateUser: false },
        });
      }

      // Resposta deliberadamente genérica: nunca confirma se o contacto está associado a uma conta.
      setSent(true);
      toast.success("Se existir uma conta associada a este contacto, receberás instruções de verificação.");
    } catch (err) {
      setError("Não foi possível iniciar a recuperação. Tenta novamente.");
      toast.error("Não foi possível iniciar a recuperação. Tenta novamente.");
      console.error("[recovery]", err);
    } finally {
      setLoading(false);
    }
  };

  const verifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || otp.length < 6) {
      setError("Introduz o código de verificação recebido.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp.trim(),
        type: "sms",
      });
      if (err) {
        setError("O código não é válido ou já expirou. Pede um novo código e tenta novamente.");
        return;
      }
      setVerified(true);
      window.location.assign("/reset-password");
    } catch (err) {
      setError("Não foi possível verificar o código. Tenta novamente.");
      console.error("[recovery-otp]", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar palavra-passe"
      subtitle="Usa o email ou número de telefone associado à tua conta."
      backTo="/login"
      footer={<Link to="/login" className="font-semibold text-primary hover:underline">Voltar ao início de sessão</Link>}
    >
      {!sent ? (
        <form ref={formRef} className="space-y-4" onSubmit={sendRecovery} noValidate>
          <div className="grid grid-cols-2 rounded-xl border border-border bg-muted/30 p-1">
            <button type="button" onClick={() => { setMethod("email"); setIdentifier(""); setError(null); }} className={"h-9 rounded-lg text-xs font-semibold transition-colors " + (method === "email" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Email</button>
            <button type="button" onClick={() => { setMethod("phone"); setIdentifier(""); setError(null); }} className={"h-9 rounded-lg text-xs font-semibold transition-colors " + (method === "phone" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Telefone</button>
          </div>

          <Field label={method === "email" ? "Email associado à conta" : "Número de telefone associado à conta"}>
            <input
              type={method === "email" ? "email" : "tel"}
              className={input}
              name="identifier"
              autoComplete={method === "email" ? "email" : "tel"}
              placeholder={method === "email" ? "nome@email.com" : "+258 84 000 0000"}
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
            />
          </Field>

          {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-sm font-semibold">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar…</> : "Continuar"}
          </Button>
        </form>
      ) : method === "phone" && !verified ? (
        <form className="space-y-4" onSubmit={verifyPhone} noValidate>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3.5">
            <div className="flex gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">Se este número estiver associado a uma conta, enviámos um código de verificação. O código é necessário antes de alterar a palavra-passe.</p>
            </div>
          </div>
          <Field label="Código de verificação">
            <input className={input + " text-center tracking-[0.35em]"} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }} />
          </Field>
          {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-sm font-semibold">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A verificar…</> : "Verificar código"}
          </Button>
        </form>
      ) : (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 text-sm font-semibold">Verificação concluída</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">A tua identidade foi verificada. Agora podes definir uma nova palavra-passe.</p>
        </div>
      )}
    </AuthLayout>
  );
}
