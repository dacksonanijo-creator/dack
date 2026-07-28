import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Clock, Banknote, ListChecks, History, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface Wallet {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  slots: number;
  slots_filled: number;
  category: string;
}

interface Profile {
  full_name: string | null;
}

function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [w, p, ts] = await Promise.all([
        supabase.from("wallets").select("available_balance,pending_balance,total_earned,total_withdrawn,currency").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("tasks").select("id,title,description,reward,slots,slots_filled,category").eq("status", "active").limit(8),
      ]);
      if (w.data) setWallet(w.data);
      if (p.data) setProfile(p.data);
      if (ts.data) setTasks(ts.data);
    })();
  }, [user]);

  const cur = wallet?.currency ?? "MZN";
  const fmt = (n: number) => `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      {/* Wallet bar — topo, tipo casa de apostas */}
      <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-border/50 bg-background/85 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
            <WalletPill icon={<Wallet className="h-3.5 w-3.5" />} label={t("dash.available")} value={fmt(wallet?.available_balance ?? 0)} highlight />
            <WalletPill icon={<Clock className="h-3.5 w-3.5" />} label={t("dash.pending")} value={fmt(wallet?.pending_balance ?? 0)} />
            <WalletPill icon={<Banknote className="h-3.5 w-3.5" />} label={t("dash.earned")} value={fmt(wallet?.total_earned ?? 0)} />
          </div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/withdraw">
              <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> {t("dash.requestWithdraw")}
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">{t("dash.greeting")},</p>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{profile?.full_name || user?.email}</h1>
      </div>

      {/* Tasks */}
      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">{t("dash.availableTasks")}</h2>
        </div>
        {tasks.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            {t("dash.noTasks")}
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <Card key={task.id} className="border-border/50 bg-card/50 p-4 transition-all hover:border-primary/40 hover:shadow-glow">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="border-primary/30 text-primary">{task.category}</Badge>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("dash.reward")}</div>
                    <div className="font-display text-base font-bold text-money">{fmt(task.reward)}</div>
                  </div>
                </div>
                <h3 className="mt-2 text-sm font-semibold">{task.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("dash.slots")}: {task.slots - task.slots_filled}/{task.slots}</span>
                  <Button size="sm" variant="ghost" asChild className="h-7 text-primary hover:bg-primary/10">
                    <Link to="/tasks/$taskId" params={{ taskId: task.id }}>{t("dash.start")}</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">{t("dash.history")}</h2>
        </div>
        <Card className="border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {t("dash.noHistory")}
        </Card>
      </section>
    </div>
  );
}

function WalletPill({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${highlight ? "border-money/40 bg-money/10" : "border-border/60 bg-card/60"}`}>
      <span className={highlight ? "text-money" : "text-muted-foreground"}>{icon}</span>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`font-display text-sm font-bold ${highlight ? "text-money" : "text-foreground"}`}>{value}</div>
      </div>
    </div>
  );
}
