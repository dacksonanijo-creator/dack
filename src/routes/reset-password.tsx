import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { useT } from "@/i18n";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova palavra-passe — Taskora" },
      { name: "description", content: "Define uma nova palavra-passe para a tua conta Taskora." },
      { property: "og:title", content: "Nova palavra-passe — Taskora" },
      { property: "og:description", content: "Define uma nova palavra-passe em segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

const input =
  "w-full rounded-xl border border-border bg-muted/40 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15";

function ResetPassword() {
  const t = useT();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) {
      setError(t("auth.reset.passwordMinLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.reset.passwordsMismatch"));
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      const msg = t(authErrorMessage(err.message));
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success(t("auth.reset.updatedSuccess"));
    navigate({ to: "/app" });
  };

  return (
    <AuthLayout
      title={t("auth.reset.title")}
      subtitle={t("auth.reset.subtitle")}
      backTo="/login"
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          {t("auth.reset.backToLogin")}
        </Link>
      }
    >
      {!ready ? (
        <p className="rounded-xl bg-accent/60 px-4 py-3 text-xs text-muted-foreground">
          {t("auth.reset.notReady")}
        </p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Field label={t("auth.reset.newPasswordLabel")}>
            <input
              type="password"
              className={input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
          </Field>
          <Field label={t("auth.reset.confirmLabel")}>
            <input
              type="password"
              className={input}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
            />
          </Field>
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="h-12 w-full rounded-xl text-base shadow-glow"
          >
            {loading ? t("auth.reset.submitLoading") : t("auth.reset.submit")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
