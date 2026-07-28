import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/tasks/$taskId")({
  component: TaskDetailsPage,
});

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  reward: number;
  slots: number;
  slots_filled: number;
  status: string;
  deadline: string | null;
}

function TaskDetailsPage() {
  const { taskId } = Route.useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [proof, setProof] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
      setTask(data as Task | null);
      if (user) {
        const { data: sub } = await supabase
          .from("task_submissions").select("id").eq("task_id", taskId).eq("user_id", user.id).maybeSingle();
        if (sub) setSubmitted(true);
      }
      setLoading(false);
    })();
  }, [taskId, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !task) return;
    if (task.slots_filled >= task.slots) return toast.error(t("task.full"));
    setBusy(true);
    const { error } = await supabase.from("task_submissions").insert({
      task_id: task.id,
      user_id: user.id,
      proof,
      reward_amount: task.reward,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("task.submitted"));
    setSubmitted(true);
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>;
  if (!task) return <div className="p-10 text-center text-muted-foreground">404</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}</Link>
      </Button>

      <Card className="border-border/60 bg-card/60 p-6">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="outline" className="border-primary/30 text-primary">{task.category}</Badge>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{t("dash.reward")}</div>
            <div className="font-display text-2xl font-bold text-money">{Number(task.reward).toFixed(2)} MZN</div>
          </div>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">{task.title}</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{task.description}</p>
        <div className="mt-4 text-xs text-muted-foreground">
          {t("dash.slots")}: {task.slots - task.slots_filled}/{task.slots}
        </div>
      </Card>

      <Card className="mt-6 border-border/60 bg-card/60 p-6">
        <h2 className="font-display text-lg font-semibold">{t("task.submitProof")}</h2>
        {submitted ? (
          <p className="mt-2 text-sm text-primary">{t("task.alreadySubmitted")}</p>
        ) : (
          <form onSubmit={submit} className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pr">{t("task.proof")}</Label>
              <Textarea id="pr" required value={proof} onChange={(e) => setProof(e.target.value)} maxLength={2000} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90">
                {busy ? "..." : t("common.confirm")}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
