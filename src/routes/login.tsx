import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, emailRe } from "@/lib/auth-errors";
import { useT } from "@/i18n";
import { passwordMeetsPolicy } from "@/lib/password-policy";
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
  "h-11.5 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/65 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5">
      <path fill="#4285F4" d="M21.35 12.27c0-.67-.06-1.32-.17-1.94H12v3.67h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.11Z" />
      <path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.44-2.35l-3.14-2.44c-.87.58-1.98.92-3.3.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.52A9.72 9.72 0 0 0 12 21.6Z" />
      <path fill="#FBBC05" d="M6.53 13.7a5.84 5.84 0 0 1 0-3.4V7.78H3.29a9.72 9.72 0 0 0 0 8.44l3.24-2.52Z" />
      <path fill="#EA4335" d="M12 6.27c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.83 3.36 14.63 2.4 12 2.4a9.72 9.72 0 0 0-8.71 5.38l3.24 2.52C7.3 7.99 9.46 6.27 12 6.27Z" />
    </svg>
  );
}

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
    const normalizedPhone = value.replace(/[\s()-]/g, "");
    const isPhone = /^\+?[1-9]\d{7,14}$/.test(normalizedPhone);
    if (!isEmail && !isPhone) {
      setError("Introduz um email válido ou um número de telefone em formato internacional.");
      return;
    }

    setLoading(true);
    try {
      const credentials = isEmail
        ? { email: value.toLowerCase(), password }
        : { phone: normalizedPhone, password };

      const { data, error: err } = await supabase.auth.signInWithPassword(credentials);

      const weakPassword =
        Boolean(err) &&
        (String((err as { code?: string }).code ?? "").toLowerCase() === "weak_password" ||
          /weak.?password/i.test(err?.message ?? ""));

      // A legacy password may be valid but below the new strength policy.
      // Do not recreate/reset the account: if Supabase has persisted a valid
      // session, send the user directly to the mandatory password upgrade.
      if (err && !weakPassword) {
        const msg = t(authErrorMessage(err.message));
        setError(msg);
        toast.error(msg);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData.session ?? data.session;

      if (weakPassword) {
        if (!session) {
          setError("A tua palavra-passe antiga foi reconhecida, mas é necessário concluir a atualização através do fluxo de recuperação.");
          toast.error("Atualiza a palavra-passe para continuar.");
          return;
        }
        sessionStorage.setItem("taskora-password-upgrade-required", "1");
        await navigate({ to: "/reset-password", replace: true });
        return;
      }

      if (sessionError || !session || !data.session || session.user.id !== data.session.user.id) {
        setError(t("auth.login.noSession"));
        toast.error(t("auth.login.noSession"));
        return;
      }

      void passwordMeetsPolicy;
      await navigate({ to: "/app", replace: true });
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
        options: {\n          redirectTo: window.location.origin + "/app",\n          queryParams: { prompt: "select_account" },\n        },
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
      <form ref={formRef} className="space-y-4.5" onSubmit={onSubmit} noValidate>
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
              placeholder="nome@email.com ou +258 84 000 0000"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError(null);
              }}
              disabled={loading || googleLoading}
              aria-label="Email ou número de telefone"
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
              aria-label="Palavra-passe"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="flex min-h-5 items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Esqueci-me da palavra-passe
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3 py-2.5 text-xs font-medium leading-5 text-destructive"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || googleLoading}
          className="h-11.5 w-full rounded-xl text-sm font-semibold shadow-[0_8px_20px_-10px_rgba(59,91,219,0.55)]"
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

        <div className="relative py-0.5">
          <div className="absolute inset-x-0 top-1/2 border-t border-border/80" />
          <span className="relative mx-auto block w-fit bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            ou
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={continueWithGoogle}
          disabled={loading || googleLoading}
          className="h-11.5 w-full rounded-xl border-border bg-white text-sm font-semibold shadow-none hover:bg-muted/40"
        >
          {googleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <span className="mr-2"><GoogleMark /></span>
          )}
          Continuar com Google
        </Button>
      </form>
    </AuthLayout>
  );
}
