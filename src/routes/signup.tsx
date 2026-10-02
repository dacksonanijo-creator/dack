import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { countries } from "@/components/taskora/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, emailRe } from "@/lib/auth-errors";
import { useT } from "@/i18n";
import { passwordIsStrong, passwordPolicyRules } from "@/lib/password-policy";
import { useAdoptDomFormValues } from "@/hooks/use-form-hydration";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar conta — Taskora" },
      { name: "description", content: "Cria a tua conta Taskora de forma segura." },
      { property: "og:title", content: "Criar conta — Taskora" },
      { property: "og:description", content: "Junta-te à Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Signup,
});

const input =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";

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

type Errors = Partial<Record<"fullName" | "email" | "password" | "confirm" | "terms", string>>;

function Signup() {
  const t = useT();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    if (!passwordIsStrong(form.password)) next.password = "A palavra-passe não cumpre todos os requisitos de segurança.";
    if (form.confirm !== form.password) next.confirm = t("auth.signup.passwordsMismatch");
    if (!accepted) next.terms = t("auth.signup.termsRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const continueWithGoogle = async () => {
    if (loading || googleLoading) return;
    setErrors({});
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/app",
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        const msg = t(authErrorMessage(error.message));
        setErrors({ email: msg });
        toast.error(msg);
        setGoogleLoading(false);
      }
    } catch (err) {
      const msg = t(authErrorMessage(err instanceof Error ? err.message : String(err)));
      setErrors({ email: msg });
      toast.error(msg);
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
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
          emailRedirectTo: window.location.origin + "/app",
          data: { full_name: form.fullName.trim(), country: form.country },
        },
      });

      if (error) {
        const msg = t(authErrorMessage(error.message));
        setErrors({ email: msg });
        toast.error(msg);
        return;
      }

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
      title="Criar conta"
      subtitle="Cria a tua conta Taskora com uma palavra-passe forte e segura."
      footer={
        <>
          Já tens conta?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Iniciar sessão
          </Link>
        </>
      }
    >
      <form ref={formRef} className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label={t("auth.signup.fullNameLabel")}>
          <input className={input} name="fullName" autoComplete="name" placeholder={t("auth.signup.fullNamePlaceholder")} value={form.fullName} onChange={set("fullName")} />
          {errText("fullName")}
        </Field>

        <Field label={t("auth.signup.emailLabel")}>
          <input type="email" className={input} name="email" autoComplete="email" placeholder={t("auth.signup.emailPlaceholder")} value={form.email} onChange={set("email")} />
          {errText("email")}
        </Field>

        <Field label={t("auth.signup.countryLabel")}>
          <select className={input} name="country" value={form.country} onChange={set("country")}>
            {countries.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </select>
        </Field>

        <Field label={t("auth.signup.passwordLabel")}>
          <PasswordInput value={form.password} onChange={set("password")} visible={showPassword} onToggle={() => setShowPassword((v) => !v)} name="password" />
          <PasswordRequirements value={form.password} />
          {errText("password")}
        </Field>

        <Field label={t("auth.signup.confirmLabel")}>
          <PasswordInput value={form.confirm} onChange={set("confirm")} visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} name="confirm" />
          {errText("confirm")}
        </Field>

        <div>
          <label className="flex items-start gap-2.5 text-xs leading-5 text-muted-foreground">
            <input type="checkbox" name="terms" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setErrors((p) => ({ ...p, terms: undefined })); }} className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--primary)]" />
            <span>{t("auth.signup.acceptTerms")} <Link to="/terms" className="text-primary hover:underline">{t("auth.signup.terms")}</Link> {t("auth.signup.and")} <Link to="/privacy" className="text-primary hover:underline">{t("auth.signup.privacyPolicy")}</Link>.</span>
          </label>
          {errText("terms")}
        </div>

        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-sm font-semibold">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A criar conta…</> : "Criar conta"}
        </Button>

        <div className="relative py-0.5">
          <div className="absolute inset-x-0 top-1/2 border-t border-border/80" />
          <span className="relative mx-auto block w-fit bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">ou</span>
        </div>

        <Button type="button" variant="outline" onClick={continueWithGoogle} disabled={loading || googleLoading} className="h-11 w-full rounded-xl border-border bg-white text-sm font-semibold shadow-none hover:bg-muted/40">
          {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="mr-2"><GoogleMark /></span>}
          Continuar com Google
        </Button>
      </form>
    </AuthLayout>
  );
}

function PasswordInput({
  value,
  onChange,
  visible,
  onToggle,
  name,
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  visible: boolean;
  onToggle: () => void;
  name: string;
}) {
  return (
    <div className="relative">
      <input type={visible ? "text" : "password"} className={input + " pr-11"} name={name} autoComplete="new-password" placeholder="••••••••••" value={value} onChange={onChange} />
      <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}>
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function PasswordRequirements({ value }: { value: string }) {
  return (
    <div className="mt-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="mb-2 text-[11px] font-semibold text-foreground">Requisitos da palavra-passe</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {passwordPolicyRules(value).map((rule) => (
          <div key={rule.key} className={"flex items-center gap-1.5 text-[11px] " + (rule.valid ? "text-primary" : "text-muted-foreground")}>
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
