import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional().default("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { mode } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Taskora</span>
        </Link>

        <Card className="border-border/60 bg-card/80 p-6 shadow-card backdrop-blur">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold">{t("auth.welcome")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          </div>

          <Tabs defaultValue={mode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.tab.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.tab.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignupForm />
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleButton />
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.loginSuccess"));
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="le">{t("auth.email")}</Label>
        <Input id="le" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lp">{t("auth.password")}</Label>
        <Input id="lp" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t("auth.forgot")}</Link>
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
        {busy ? "..." : t("auth.tab.login")}
      </Button>
    </form>
  );
}

function SignupForm() {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: fullName, phone },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.signupSuccess"));
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="sn">{t("auth.fullName")}</Label>
        <Input id="sn" required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="se">{t("auth.email")}</Label>
        <Input id="se" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sph">{t("auth.phone")}</Label>
        <Input id="sph" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sp">{t("auth.password")}</Label>
        <Input id="sp" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
        {busy ? "..." : t("auth.tab.signup")}
      </Button>
    </form>
  );
}

function GoogleButton() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined,
    });
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message ?? "Erro");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
    window.location.href = "/dashboard";
  };
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={busy} className="w-full">
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
      {t("auth.continueGoogle")}
    </Button>
  );
}
