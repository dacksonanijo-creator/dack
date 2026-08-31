import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, emailRe } from "@/lib/auth-errors";
import { useT } from "@/i18n";
import { useAdoptDomFormValues } from "@/hooks/use-form-hydration";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Taskora" },
      { name: "description", content: "Acede à tua conta Taskora e continua as tuas microtarefas." },
      { property: "og:title", content: "Entrar — Taskora" },
      { property: "og:description", content: "Acede à tua conta Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const input =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10";

function Login() {
  const t = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  useAdoptDomFormValues(formRef, (values) => {
    if (values.email) setEmail(values.email);
    if (values.password) setPassword(values.password);
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!emailRe.test(email.trim())) {
      setError(t("auth.login.emailRequired"));
      return;
    }
    if (!password) {
      setError(t("auth.login.passwordRequired"));
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
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

  return (
    <AuthLayout title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <form ref={formRef} className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label={t("auth.login.emailLabel")}>
          <input
            type="email"
            className={input}
            name="email"
            autoComplete="email"
            placeholder={t("auth.login.emailPlaceholder")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label={t("auth.login.passwordLabel")}>
          <input
            type="password"
            className={input}
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
        </Field>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            {t("auth.login.forgotPassword")}
          </Link>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 w-full rounded-xl text-base shadow-glow"
        >
          {loading ? t("auth.login.submitLoading") : t("auth.login.submit")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t("auth.login.noAccount")}{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            {t("auth.login.createAccount")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
