import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, emailRe } from "@/lib/auth-errors";
import { useT } from "@/i18n";
import { useAdoptDomFormValues } from "@/hooks/use-form-hydration";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Iniciar sessão — Taskora" },
      { name: "description", content: "Acede à tua conta Taskora de forma segura." },
      { property: "og:title", content: "Iniciar sessão — Taskora" },
      { property: "og:description", content: "Acede à tua conta Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const input =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

function Login() {
  const t = useT();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  useAdoptDomFormValues(formRef, (values) => {
    if (values.email) setIdentifier(values.email);
    if (values.password) setPassword(values.password);
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setError(null);

    const value = identifier.trim();
    if (!value) {
      setError("Introduz o teu email ou número de telefone.");
      return;
    }
    if (!password) {
      setError(t("auth.login.passwordRequired"));
      return;
    }

    const isEmail = emailRe.test(value);
    const isPhone = /^\+?[1-9]\d{7,14}$/.test(value.replace(/[\s()-]/g, ""));
    if (!isEmail && !isPhone) {
      setError("Introduz um email válido ou um número de telefone em formato internacional.");
      return;
    }

    setLoading(true);
    try {
      const credentials = isEmail
        ? { email: value.toLowerCase(), password }
        : { phone: value.replace(/[\s()-]/g, ""), password };

      const { data, error: err } = await supabase.auth.signInWithPassword(credentials);
      if (err) {
        const msg = t(authErrorMessage(err.message));
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!data.session) {
        setError(t("auth.login.noSession"));
        return;
      }
      navigate({ to: "/app" });
    } catch (err) {
      const msg = t(authErrorMessage(err instanceof Error ? err.message : String(err)));
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    if (loading || googleLoading) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/app" },
      });
      if (err) {
        const msg = t(authErrorMessage(err.message));
        setError(msg);
        toast.error(msg);
        setGoogleLoading(false);
      }
    } catch (err) {
      const msg = t(authErrorMessage(err instanceof Error ? err.message : String(err)));
      setError(msg);
      toast.error(msg);
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Iniciar sessão"
      subtitle="Entra na tua conta Taskora para continuares de onde ficaste."
      footer={
        <>
          Ainda não tens conta?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form ref={formRef} className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Email ou número de telefone">
          <div className="relative">
            {identifier.includes("@") ? (
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            ) : (
              <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <input
              type="text"
              inputMode="email"
              className={input + " pl-10"}
              name="email"
              autoComplete="username"
              placeholder="Email ou +258 84 000 0000"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError(null);
              }}
              disabled={loading || googleLoading}
            />
          </div>
        </Field>

        <Field label="Palavra-passe">
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              className={input + " pl-10 pr-11"}
              name="password"
              autoComplete="current-password"
              placeholder="Introduz a tua palavra-passe"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              disabled={loading || googleLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs font-medium leading-5 text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
            Esqueci-me da palavra-passe
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading || googleLoading}
          className="h-11 w-full rounded-xl text-sm font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A iniciar sessão…
            </>
          ) : (
            "Iniciar sessão"
          )}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-x-0 top-1/2 border-t border-border/70" />
          <span className="relative mx-auto block w-fit bg-card px-3 text-[11px] font-medium text-muted-foreground">
            ou
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={continueWithGoogle}
          disabled={loading || googleLoading}
          className="h-11 w-full rounded-xl border-border text-sm font-semibold"
        >
          {googleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <span className="mr-2 text-sm font-bold">G</span>
          )}
          Continuar com Google
        </Button>
      </form>
    </AuthLayout>
  );
}
