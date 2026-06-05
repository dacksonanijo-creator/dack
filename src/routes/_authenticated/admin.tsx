import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

interface Partner { id: string; name: string; slug: string; api_url: string | null; api_key: string | null; active: boolean; notes: string | null; }
interface Provider { id: string; name: string; slug: string; api_url: string | null; api_key: string | null; active: boolean; min_amount: number; currency: string; }
interface Withdrawal { id: string; user_id: string; method: string; amount: number; status: string; account_holder: string; account_number: string; created_at: string; transaction_id: string | null; }

function AdminPanel() {
  const { isAdmin, loading } = useRoles();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
  }, [isAdmin, loading, navigate]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>;
  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{t("admin.title")}</h1>
      <Tabs defaultValue="withdrawals" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="withdrawals">{t("admin.withdrawals")}</TabsTrigger>
          <TabsTrigger value="partners">{t("admin.partners")}</TabsTrigger>
          <TabsTrigger value="providers">{t("admin.providers")}</TabsTrigger>
        </TabsList>
        <TabsContent value="withdrawals" className="mt-4"><WithdrawalsTab /></TabsContent>
        <TabsContent value="partners" className="mt-4"><PartnersTab /></TabsContent>
        <TabsContent value="providers" className="mt-4"><ProvidersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function WithdrawalsTab() {
  const { t } = useI18n();
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [txid, setTxid] = useState<Record<string, string>>({});

  const load = () => supabase.from("withdrawals").select("*").order("created_at", { ascending: false })
    .then(({ data }) => setItems((data ?? []) as Withdrawal[]));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: "paid" | "rejected") => {
    const { error } = await supabase.from("withdrawals").update({
      status, transaction_id: txid[id] || null, processed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    load();
  };

  if (items.length === 0) return <Card className="border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">{t("common.empty")}</Card>;

  return (
    <div className="space-y-2">
      {items.map((w) => (
        <Card key={w.id} className="border-border/60 bg-card/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium uppercase">{w.method} • {Number(w.amount).toFixed(2)} MZN</div>
              <div className="text-xs text-muted-foreground">{w.account_holder} • {w.account_number}</div>
              <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div>
            </div>
            <Badge variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "outline"}>{w.status}</Badge>
          </div>
          {w.status === "pending" && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-xs">{t("admin.txid")}</Label>
                <Input value={txid[w.id] ?? ""} onChange={(e) => setTxid({ ...txid, [w.id]: e.target.value })} placeholder="opcional" />
              </div>
              <Button size="sm" onClick={() => updateStatus(w.id, "paid")} className="bg-gradient-primary text-primary-foreground"><Check className="mr-1 h-4 w-4" />{t("admin.approve")}</Button>
              <Button size="sm" variant="destructive" onClick={() => updateStatus(w.id, "rejected")}><X className="mr-1 h-4 w-4" />{t("admin.reject")}</Button>
            </div>
          )}
          {w.transaction_id && <div className="mt-2 text-xs text-muted-foreground">TX: {w.transaction_id}</div>}
        </Card>
      ))}
    </div>
  );
}

function PartnersTab() {
  const { t } = useI18n();
  const [items, setItems] = useState<Partner[]>([]);
  const [edit, setEdit] = useState<Partner | null>(null);
  const load = () => supabase.from("partner_apis").select("*").order("name").then(({ data }) => setItems((data ?? []) as Partner[]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit) return;
    const { error } = await supabase.from("partner_apis").update({
      name: edit.name, api_url: edit.api_url, api_key: edit.api_key, active: edit.active, notes: edit.notes,
    }).eq("id", edit.id);
    if (error) return toast.error(error.message);
    toast.success(t("common.saved"));
    setEdit(null); load();
  };

  const addNew = async () => {
    const slug = prompt("Slug único (ex: minha-api)");
    if (!slug) return;
    const name = prompt("Nome da empresa parceira") ?? slug;
    const { error } = await supabase.from("partner_apis").insert({ slug, name, active: false });
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={addNew}><Plus className="mr-1 h-4 w-4" />Nova API</Button>
      </div>
      <div className="space-y-2">
        {items.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-border/60 bg-card/60 p-4">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.slug}</div>
              {p.notes && <div className="mt-1 text-xs text-muted-foreground">{p.notes}</div>}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={p.active ? "default" : "outline"}>{p.active ? "ativo" : "inativo"}</Badge>
              <Button size="sm" variant="outline" onClick={() => setEdit(p)}>{t("common.edit")}</Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.name}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nome</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>API URL</Label><Input value={edit.api_url ?? ""} onChange={(e) => setEdit({ ...edit, api_url: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>API Key</Label><Input type="password" value={edit.api_key ?? ""} onChange={(e) => setEdit({ ...edit, api_key: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Notas</Label><Input value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
              <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>{t("common.cancel")}</Button>
            <Button onClick={save} className="bg-gradient-primary text-primary-foreground">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProvidersTab() {
  const { t } = useI18n();
  const [items, setItems] = useState<Provider[]>([]);
  const [edit, setEdit] = useState<Provider | null>(null);
  const load = () => supabase.from("payment_providers").select("*").order("name").then(({ data }) => setItems((data ?? []) as Provider[]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit) return;
    const { error } = await supabase.from("payment_providers").update({
      name: edit.name, api_url: edit.api_url, api_key: edit.api_key,
      active: edit.active, min_amount: edit.min_amount, currency: edit.currency,
    }).eq("id", edit.id);
    if (error) return toast.error(error.message);
    toast.success(t("common.saved"));
    setEdit(null); load();
  };

  return (
    <div className="space-y-2">
      {items.map((p) => (
        <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-border/60 bg-card/60 p-4">
          <div>
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-muted-foreground">{p.slug} • min {p.min_amount} {p.currency}</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={p.active ? "default" : "outline"}>{p.active ? "ativo" : "inativo"}</Badge>
            <Button size="sm" variant="outline" onClick={() => setEdit(p)}>{t("common.edit")}</Button>
          </div>
        </Card>
      ))}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.name}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nome</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>API URL</Label><Input value={edit.api_url ?? ""} onChange={(e) => setEdit({ ...edit, api_url: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>API Key</Label><Input type="password" value={edit.api_key ?? ""} onChange={(e) => setEdit({ ...edit, api_key: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Mínimo</Label><Input type="number" value={edit.min_amount} onChange={(e) => setEdit({ ...edit, min_amount: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Moeda</Label><Input value={edit.currency} onChange={(e) => setEdit({ ...edit, currency: e.target.value })} maxLength={3} /></div>
              </div>
              <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>{t("common.cancel")}</Button>
            <Button onClick={save} className="bg-gradient-primary text-primary-foreground">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
