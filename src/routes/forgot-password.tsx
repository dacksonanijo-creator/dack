import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.recover.sent"));
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Taskora</span>
        </Link>
        <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
          <h1 className="font-display text-2xl font-bold">{t("auth.recover.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.recover.desc")}</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fe">{t("auth.email")}</Label>
              <Input id="fe" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {busy ? "..." : t("auth.recover.send")}
            </Button>
            <Link to="/auth" search={{ mode: "login" }} className="block text-center text-xs text-muted-foreground hover:text-foreground">
              ← {t("auth.tab.login")}
            </Link>
          </form>
        </Card>
      </div>
    </div>
  );
}
