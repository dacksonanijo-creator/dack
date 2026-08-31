import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { countries } from "@/components/taskora/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, emailRe } from "@/lib/auth-errors";
import { useT } from "@/i18n";
import { useAdoptDomFormValues } from "@/hooks/use-form-hydration";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — Taskora" },
      { name: "description", content: "Cria a tua conta Taskora em menos de um minuto." },
      { property: "og:title", content: "Criar conta — Taskora" },
      { property: "og:description", content: "Junta-te à Taskora e começa a ganhar com microtarefas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Signup,
});

const input =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10";

type Errors = Partial<Record<"fullName" | "email" | "password" | "confirm" | "terms", string>>;

function Signup() {
  const t = useT();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    country: countries[0],
    password: "",
    confirm: "",
  });

  const formRef = useRef<HTMLFormElement>(null);
  useAdoptDomFormValues(formRef, (values, checks) => {
    setForm((f) => ({
      fullName: values.fullName ?? f.fullName,
      email: values.email ?? f.email,
      country: values.country ?? f.country,
      password: values.password ?? f.password,
      confirm: values.confirm ?? f.confirm,
    }));
    if (checks.terms) setAccepted(true);
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const validate = () => {
    const next: Errors = {};
    if (form.fullName.trim().length < 3) next.fullName = t("auth.signup.fullNameInvalid");
    if (!emailRe.test(form.email.trim())) next.email = t("auth.signup.emailInvalid");
    if (form.password.length < 6) next.password = t("auth.signup.passwordMinLength");
    if (form.confirm !== form.password) next.confirm = t("auth.signup.passwordsMismatch");
    if (!accepted) next.terms = t("auth.signup.termsRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) {
      toast.error(t("auth.signup.fixFields"));
      return;
    }

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { full_name: form.fullName.trim(), country: form.country },
        },
      });

      if (error) {
        const msg = t(authErrorMessage(error.message));
        setErrors({ email: msg });
        toast.error(msg);
        return;
      }

      // Conta já existente devolve user sem identidades associadas.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        const msg = t("auth.signup.alreadyRegistered");
        setErrors({ email: msg });
        toast.error(msg);
        return;
      }

      let session = data.session;
      if (!session) {
        const signIn = await supabase.auth.signInWithPassword({ email, password: form.password });
        if (signIn.error) {
          toast.success(t("auth.signup.confirmEmailToast"));
          navigate({ to: "/login" });
          return;
        }
        session = signIn.data.session;
      }

      if (session?.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: session.user.id,
          full_name: form.fullName.trim(),
          email,
          country: form.country,
        });
        if (profileError) console.error("[signup] perfil:", profileError.message);
      }

      toast.success(t("auth.signup.createdSuccess"));
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(t(authErrorMessage(err instanceof Error ? err.message : String(err))));
    } finally {
      setLoading(false);
    }
  };

  const errText = (k: keyof Errors) =>
    errors[k] ? <span className="mt-1 block text-xs font-medium text-destructive">{errors[k]}</span> : null;

  return (
    <AuthLayout
      title={t("auth.signup.title")}
      subtitle={t("auth.signup.subtitle")}
      footer={
        <>
          {t("auth.signup.haveAccount")}{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {t("auth.signup.login")}
          </Link>
        </>
      }
    >
      <form ref={formRef} className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label={t("auth.signup.fullNameLabel")}>
          <input
            className={input}
            name="fullName"
            autoComplete="name"
            placeholder={t("auth.signup.fullNamePlaceholder")}
            value={form.fullName}
            onChange={set("fullName")}
          />
          {errText("fullName")}
        </Field>
        <Field label={t("auth.signup.emailLabel")}>
          <input
            type="email"
            className={input}
            name="email"
            autoComplete="email"
            placeholder={t("auth.signup.emailPlaceholder")}
            value={form.email}
            onChange={set("email")}
          />
          {errText("email")}
        </Field>
        <Field label={t("auth.signup.countryLabel")}>
          <select className={input} name="country" value={form.country} onChange={set("country")}>
            {countries.map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.signup.passwordLabel")}>
            <input
              type="password"
              className={input}
              name="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
            />
            {errText("password")}
          </Field>
          <Field label={t("auth.signup.confirmLabel")}>
            <input
              type="password"
              className={input}
              name="confirm"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={set("confirm")}
            />
            {errText("confirm")}
          </Field>
        </div>
        <div>
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              name="terms"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                setErrors((p) => ({ ...p, terms: undefined }));
              }}
              className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--primary)]"
            />
            <span>
              {t("auth.signup.acceptTerms")}{" "}
              <Link to="/terms" className="text-primary hover:underline">
                {t("auth.signup.terms")}
              </Link>{" "}
              {t("auth.signup.and")}{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                {t("auth.signup.privacyPolicy")}
              </Link>
              .
            </span>
          </label>
          {errText("terms")}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 w-full rounded-xl text-base shadow-glow"
        >
          {loading ? t("auth.signup.submitLoading") : t("auth.signup.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
