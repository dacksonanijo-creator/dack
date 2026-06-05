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

export const Route = createFileRoute("/_authenticated/withdraw")({
  component: WithdrawPage,
});

interface Provider { id: string; slug: string; name: string; min_amount: number; currency: string; }

function WithdrawPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState("");
  const [holder, setHolder] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [available, setAvailable] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("payment_providers").select("id,slug,name,min_amount,currency").eq("active", true).order("name")
      .then(({ data }) => {
        const list = (data ?? []) as Provider[];
        setProviders(list);
        if (list[0]) setProviderId(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("available_balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAvailable(Number(data?.available_balance ?? 0)));
  }, [user]);

  const selected = providers.find((p) => p.id === providerId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return toast.error("Selecione um método");
    const value = Number(amount);
    if (!value || value <= 0) return toast.error("Valor inválido");
    if (value < selected.min_amount) return toast.error(`Mínimo: ${selected.min_amount} ${selected.currency}`);
    if (value > available) return toast.error(t("wd.insufficient"));
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id, method: selected.slug, provider_id: selected.id,
      account_holder: holder, account_number: account, amount: value, currency: selected.currency,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("wd.success"));
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{t("wd.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("dash.available")}: <span className="font-semibold text-primary">{available.toFixed(2)} MZN</span>
      </p>

      <Card className="mt-6 border-border/60 bg-card/60 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("wd.method")}</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="h">{t("wd.holder")}</Label><Input id="h" required maxLength={100} value={holder} onChange={(e) => setHolder(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="a">{t("wd.account")}</Label><Input id="a" required maxLength={50} value={account} onChange={(e) => setAccount(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="am">{t("wd.amount")} ({selected?.currency ?? "MZN"})</Label>
            <Input id="am" type="number" step="0.01" min={selected?.min_amount ?? 1} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90">
              {busy ? "..." : t("wd.submit")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
