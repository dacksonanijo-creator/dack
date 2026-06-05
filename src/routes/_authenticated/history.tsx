import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

interface Submission { id: string; status: string; reward_amount: number; created_at: string; task_id: string; }
interface Withdrawal { id: string; status: string; amount: number; method: string; created_at: string; transaction_id: string | null; }

function HistoryPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [wds, setWds] = useState<Withdrawal[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("task_submissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setSubs((data ?? []) as Submission[]));
    supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setWds((data ?? []) as Withdrawal[]));
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{t("nav.history")}</h1>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold">{t("dash.availableTasks")}</h2>
        {subs.length === 0 ? (
          <Card className="border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">{t("common.empty")}</Card>
        ) : (
          <div className="space-y-2">
            {subs.map((s) => (
              <Card key={s.id} className="flex items-center justify-between gap-3 border-border/60 bg-card/60 p-4">
                <div>
                  <div className="text-sm font-medium">#{s.task_id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "outline"}>{s.status}</Badge>
                  <span className="font-semibold text-primary">{Number(s.reward_amount).toFixed(2)} MZN</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-semibold">{t("dash.withdrawals")}</h2>
        {wds.length === 0 ? (
          <Card className="border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">{t("common.empty")}</Card>
        ) : (
          <div className="space-y-2">
            {wds.map((w) => (
              <Card key={w.id} className="flex items-center justify-between gap-3 border-border/60 bg-card/60 p-4">
                <div>
                  <div className="text-sm font-medium uppercase">{w.method}</div>
                  <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}{w.transaction_id ? ` • ${w.transaction_id}` : ""}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "outline"}>{w.status}</Badge>
                  <span className="font-semibold text-primary">{Number(w.amount).toFixed(2)} MZN</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
