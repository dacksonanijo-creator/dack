import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { t, setLang } = useI18n();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("MZ");
  const [pref, setPref] = useState("pt");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setFullName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setCountry(data.country ?? "MZ");
      setPref(data.preferred_language ?? "pt");
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      phone,
      country,
      preferred_language: pref,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    if (pref === "pt" || pref === "en") setLang(pref);
    toast.success(t("common.saved"));
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{t("profile.title")}</h1>
      <Card className="mt-6 border-border/60 bg-card/60 p-6">
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="n">{t("auth.fullName")}</Label>
            <Input id="n" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("auth.email")}</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">{t("auth.phone")}</Label>
            <Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c">{t("profile.country")}</Label>
              <Input id="c" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.language")}</Label>
              <Select value={pref} onValueChange={setPref}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
              {t("common.back")}
            </Button>
            <Button type="submit" disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90">
              {busy ? "..." : t("common.save")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
