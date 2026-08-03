import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, emailRe } from "@/lib/auth-errors";
import { useT } from "@/i18n";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar palavra-passe — Taskora" },
      { name: "description", content: "Recupera o acesso à tua conta Taskora por email." },
      { property: "og:title", content: "Recuperar palavra-passe — Taskora" },
      { property: "og:description", content: "Enviamos-te um link de recuperação por email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Forgot,
});

const input =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10";

function Forgot() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!emailRe.test(email.trim())) {
      setError(t("auth.forgot.emailInvalid"));
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      const msg = t(authErrorMessage(err.message));
      setError(msg);
      toast.error(msg);
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      backTo="/login"
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          {t("auth.forgot.backToLogin")}
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center rounded-2xl bg-accent/60 p-6 text-center">
          <CheckCircle2 className="h-9 w-9 text-money" />
          <p className="mt-3 font-display text-sm font-bold">{t("auth.forgot.sentTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("auth.forgot.sentSubtitle")}
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Field label={t("auth.forgot.emailLabel")}>
            <input
              type="email"
              className={input}
              placeholder={t("auth.forgot.emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
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
            {loading ? t("auth.forgot.submitLoading") : t("auth.forgot.submit")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
