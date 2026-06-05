import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/company/")({
  component: CompanyPanel,
});

interface Company { id: string; name: string; website: string | null; description: string | null; }
interface Task { id: string; title: string; reward: number; status: string; slots: number; slots_filled: number; }

function CompanyPanel() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: cs } = await supabase.from("companies").select("*").eq("owner_id", user.id);
    setCompanies((cs ?? []) as Company[]);
    if (cs && cs.length > 0) {
      const ids = cs.map((c) => c.id);
      const { data: ts } = await supabase.from("tasks").select("*").in("company_id", ids).order("created_at", { ascending: false });
      setTasks((ts ?? []) as Task[]);
    }
  };

  useEffect(() => { load(); }, [user]);

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("companies").insert({ owner_id: user.id, name, website: website || null, description: description || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("company.created"));
    setName(""); setWebsite(""); setDescription(""); setCreating(false);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("company.title")}</h1>
          <p className="text-sm text-muted-foreground">{companies.length} {companies.length === 1 ? "empresa" : "empresas"}</p>
        </div>
        {companies.length > 0 && (
          <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link to="/company/tasks/new"><Plus className="mr-1 h-4 w-4" />{t("company.newTask")}</Link>
          </Button>
        )}
      </div>

      {companies.length === 0 && !creating && (
        <Card className="mt-6 border-dashed border-border/60 p-10 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Crie a sua empresa para começar a publicar tarefas.</p>
          <Button onClick={() => setCreating(true)} className="mt-4 bg-gradient-primary text-primary-foreground hover:opacity-90">
            {t("company.create")}
          </Button>
        </Card>
      )}

      {creating && (
        <Card className="mt-6 border-border/60 bg-card/60 p-6">
          <form onSubmit={createCompany} className="space-y-3">
            <div className="space-y-1.5"><Label>{t("company.name")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
            <div className="space-y-1.5"><Label>{t("company.website")}</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} /></div>
            <div className="space-y-1.5"><Label>{t("company.description")}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90">{busy ? "..." : t("common.create")}</Button>
            </div>
          </form>
        </Card>
      )}

      {companies.length > 0 && (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {companies.map((c) => (
              <Card key={c.id} className="border-border/60 bg-card/60 p-5">
                <h3 className="font-semibold">{c.name}</h3>
                {c.website && <a href={c.website} target="_blank" className="text-xs text-primary">{c.website}</a>}
                {c.description && <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>}
              </Card>
            ))}
          </div>

          <h2 className="mt-10 mb-3 font-display text-lg font-semibold">{t("company.tasks")}</h2>
          {tasks.length === 0 ? (
            <Card className="border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">{t("common.empty")}</Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id} className="flex items-center justify-between gap-3 border-border/60 bg-card/60 p-4">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-muted-foreground">{task.slots_filled}/{task.slots} vagas</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={task.status === "active" ? "default" : "outline"}>{task.status}</Badge>
                    <span className="font-semibold text-primary">{Number(task.reward).toFixed(2)} MZN</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
