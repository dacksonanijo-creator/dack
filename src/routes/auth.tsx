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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional().default("login"),
  role: z.enum(["user", "company"]).optional().default("user"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

// País → moeda
export const COUNTRIES = [
  { code: "MZ", name: "Moçambique", currency: "MZN" },
  { code: "AO", name: "Angola", currency: "AOA" },
  { code: "BR", name: "Brasil", currency: "BRL" },
  { code: "PT", name: "Portugal", currency: "EUR" },
  { code: "ZA", name: "África do Sul", currency: "ZAR" },
  { code: "NG", name: "Nigéria", currency: "NGN" },
  { code: "KE", name: "Quénia", currency: "KES" },
  { code: "US", name: "Estados Unidos", currency: "USD" },
  { code: "GB", name: "Reino Unido", currency: "GBP" },
] as const;

function AuthPage() {
  const { t } = useI18n();
  const { mode, role } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-5 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Taskora</span>
        </Link>

        <Card className="border-border/60 bg-card/80 p-5 shadow-card backdrop-blur">
          <div className="mb-5 text-center">
            <h1 className="font-display text-xl font-bold">{t("auth.welcome")}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{t("auth.subtitle")}</p>
          </div>

          <Tabs defaultValue={mode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.tab.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.tab.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-5">
              <SignupForm initialRole={role} />
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-3">
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
      <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        {busy ? "..." : t("auth.tab.login")}
      </Button>
    </form>
  );
}

function SignupForm({ initialRole }: { initialRole: "user" | "company" }) {
  const { t } = useI18n();
  const [accountType, setAccountType] = useState<"user" | "company">(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<string>("MZ");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const selected = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: {
          full_name: accountType === "company" ? companyName : fullName,
          phone,
          country: selected.code,
          account_type: accountType,
        },
      },
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    const uid = data.user?.id;
    if (uid) {
      // Update profile country and wallet currency to match selection
      await supabase.from("profiles").update({ country: selected.code }).eq("id", uid);
      // Note: wallet currency update requires admin grants; best-effort no-op if blocked.
      if (accountType === "company") {
        const { data: c } = await supabase
          .from("companies")
          .insert({ name: companyName, owner_id: uid, country: selected.code })
          .select("id")
          .single();
        if (c) {
          await supabase.from("user_roles").insert({ user_id: uid, role: "company" });
        }
      }
    }

    setBusy(false);
    toast.success(t("auth.signupSuccess"));
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("auth.accountType")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={accountType === "user" ? "default" : "outline"}
            size="sm"
            onClick={() => setAccountType("user")}
            className={accountType === "user" ? "bg-primary text-primary-foreground" : ""}
          >
            {t("auth.type.user")}
          </Button>
          <Button
            type="button"
            variant={accountType === "company" ? "default" : "outline"}
            size="sm"
            onClick={() => setAccountType("company")}
            className={accountType === "company" ? "bg-primary text-primary-foreground" : ""}
          >
            {t("auth.type.company")}
          </Button>
        </div>
      </div>

      {accountType === "company" ? (
        <div className="space-y-1.5">
          <Label htmlFor="cn">{t("company.name")}</Label>
          <Input id="cn" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={100} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="sn">{t("auth.fullName")}</Label>
          <Input id="sn" required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="sc">{t("auth.country")}</Label>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger id="sc">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name} — {c.currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
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
