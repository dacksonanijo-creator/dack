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

function WithdrawPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState("mpesa");
  const [holder, setHolder] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [available, setAvailable] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("available_balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAvailable(Number(data?.available_balance ?? 0)));
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return toast.error("Valor inválido");
    if (value > available) return toast.error(t("wd.insufficient"));
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      method,
      account_holder: holder,
      account_number: account,
      amount: value,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("wd.success"));
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{t("wd.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("dash.available")}: <span className="font-semibold text-primary">{available.toFixed(2)} MZN</span></p>

      <Card className="mt-6 border-border/60 bg-card/60 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("wd.method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="emola">e-Mola</SelectItem>
                <SelectItem value="bank">Transferência bancária</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h">{t("wd.holder")}</Label>
            <Input id="h" required maxLength={100} value={holder} onChange={(e) => setHolder(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a">{t("wd.account")}</Label>
            <Input id="a" required maxLength={50} value={account} onChange={(e) => setAccount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="am">{t("wd.amount")} (MZN)</Label>
            <Input id="am" type="number" step="0.01" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
            {busy ? "..." : t("wd.submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
