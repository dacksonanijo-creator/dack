import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Clock, TrendingUp, Banknote, ListChecks, History, ArrowUpRight } from "lucide-react";
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{t("dash.greeting")},</p>
          <h1 className="font-display text-3xl font-bold">{profile?.full_name || user?.email}</h1>
        </div>
        <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90">
          <Link to="/withdraw">
            <ArrowUpRight className="mr-1 h-4 w-4" /> {t("dash.requestWithdraw")}
          </Link>
        </Button>
      </div>

      {/* Wallet cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WalletCard icon={<Wallet />} label={t("dash.available")} value={fmt(wallet?.available_balance ?? 0)} highlight />
        <WalletCard icon={<Clock />} label={t("dash.pending")} value={fmt(wallet?.pending_balance ?? 0)} />
        <WalletCard icon={<TrendingUp />} label={t("dash.earned")} value={fmt(wallet?.total_earned ?? 0)} />
        <WalletCard icon={<Banknote />} label={t("dash.withdrawn")} value={fmt(wallet?.total_withdrawn ?? 0)} />
      </div>

      {/* Tasks */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">{t("dash.availableTasks")}</h2>
        </div>
        {tasks.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
            {t("dash.noTasks")}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <Card key={task.id} className="border-border/50 bg-card/50 p-5 transition-all hover:border-primary/40 hover:shadow-glow">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="border-primary/30 text-primary">{task.category}</Badge>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{t("dash.reward")}</div>
                    <div className="font-display text-lg font-bold text-primary">{fmt(task.reward)}</div>
                  </div>
                </div>
                <h3 className="mt-3 font-semibold">{task.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("dash.slots")}: {task.slots - task.slots_filled}/{task.slots}</span>
                  <Button size="sm" variant="ghost" asChild className="text-primary hover:bg-primary/10">
                    <Link to="/tasks/$taskId" params={{ taskId: task.id }}>{t("dash.start")}</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* History placeholder */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">{t("dash.history")}</h2>
        </div>
        <Card className="border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          {t("dash.noHistory")}
        </Card>
      </section>
    </div>
  );
}

function WalletCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`relative overflow-hidden border-border/50 p-5 ${highlight ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-card/50"}`}>
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${highlight ? "bg-primary-foreground/10" : "bg-primary/15 text-primary"}`}>
        {icon}
      </div>
      <div className={`mt-4 text-xs ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </Card>
  );
}
