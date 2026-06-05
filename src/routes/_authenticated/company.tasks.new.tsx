import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/company/tasks/new")({
  component: NewTaskPage,
});

function NewTaskPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [reward, setReward] = useState("10");
  const [slots, setSlots] = useState("10");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("companies").select("id,name").eq("owner_id", user.id).then(({ data }) => {
      const list = (data ?? []) as { id: string; name: string }[];
      setCompanies(list);
      if (list[0]) setCompanyId(list[0].id);
    });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return toast.error("Crie uma empresa primeiro");
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      company_id: companyId, title, description, category,
      reward: Number(reward), slots: Number(slots), status: "active",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("task.published"));
    navigate({ to: "/company" });
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{t("company.newTask")}</h1>
      <Card className="mt-6 border-border/60 bg-card/60 p-6">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t("task.title")}</Label><Input required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("task.description")}</Label><Textarea required maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("task.category")}</Label><Input required maxLength={50} value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("task.reward")} (MZN)</Label><Input required type="number" step="0.01" min="0" value={reward} onChange={(e) => setReward(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t("task.slots")}</Label><Input required type="number" min="1" value={slots} onChange={(e) => setSlots(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/company" })}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90">{busy ? "..." : t("task.publish")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
