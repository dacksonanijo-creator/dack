import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Clock3, Mail, Megaphone, MonitorSmartphone, Save, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [
    { title: "Notificações — Admin Taskora" },
    { name: "robots", content: "noindex" },
    { name: "description", content: "Centro administrativo de notificações do TASKORA." },
  ]}),
  component: NotificationsAdmin,
});

type Rule = { rule_key:string; name:string; description:string; category:string; enabled:boolean; internal_enabled:boolean; push_enabled:boolean; email_enabled:boolean; critical:boolean };
type Template = { id:string; name:string; title:string; message:string; type:string; channel:string; active:boolean };
type Campaign = { id:string; name:string; title:string; message:string; type:string; priority:string; audience_type:string; channels:string[]; status:string; scheduled_for:string|null; created_at:string };
type UserHit = { id:string; email:string|null; full_name:string|null; phone:string|null };
type Log = { id:string; action:string; result:string; recipient_count:number; sent_count:number; delivered_count:number; read_count:number; failed_count:number; channels:string[]; created_at:string };

const inputClass = "h-9 rounded-lg text-sm";
const channelOptions = [
  { key:"taskora", label:"TASKORA", icon:Bell },
  { key:"push", label:"Dispositivo", icon:Smartphone },
  { key:"email", label:"Email", icon:Mail },
];

function NotificationsAdmin() {
  const [tab,setTab]=useState("send"), [rules,setRules]=useState<Rule[]>([]);
  const [templates,setTemplates]=useState<Template[]>([]), [campaigns,setCampaigns]=useState<Campaign[]>([]), [logs,setLogs]=useState<Log[]>([]);
  const [loading,setLoading]=useState(true), [title,setTitle]=useState(""), [message,setMessage]=useState("");
  const [type,setType]=useState("admin_message"), [priority,setPriority]=useState("normal"), [audience,setAudience]=useState("all"), [country,setCountry]=useState("");
  const [channels,setChannels]=useState<string[]>(["taskora"]), [query,setQuery]=useState(""), [users,setUsers]=useState<UserHit[]>([]), [selected,setSelected]=useState<string[]>([]);
  const [templateName,setTemplateName]=useState(""), [savingTemplate,setSavingTemplate]=useState(false);
  const [campaign,setCampaign]=useState({name:"",title:"",message:"",type:"admin_message",priority:"normal",audience:"all",country:"",channels:["taskora"] as string[],scheduled:""});
  const [sending,setSending]=useState(false);

  const load = async () => {
    setLoading(true);
    const [r,t,c,l] = await Promise.all([
      (supabase as any).from("notification_rules").select("*").order("category").order("name"),
      (supabase as any).from("notification_templates").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("notification_campaigns").select("id,name,title,message,type,priority,audience_type,channels,status,scheduled_for,created_at").order("created_at",{ascending:false}).limit(30),
      (supabase as any).from("notification_send_log").select("*").order("created_at",{ascending:false}).limit(30),
    ]);
    if(r.error) toast.error("Não foi possível carregar as regras.");
    setRules(r.data ?? []); setTemplates(t.data ?? []); setCampaigns(c.data ?? []); setLogs(l.data ?? []); setLoading(false);
  };
  useEffect(()=>{ void load(); },[]);

  const searchUsers = async () => {
    const {data,error}=await (supabase as any).rpc("admin_search_notification_users",{p_query:query,p_limit:20});
    if(error) toast.error("Não foi possível pesquisar utilizadores."); else setUsers(data??[]);
  };
  useEffect(()=>{ if(audience==="selected") void searchUsers(); },[audience]);

  const toggleChannel=(key:string)=>setChannels(c=>key==="taskora"?["taskora"]:c.includes(key)?c.filter(x=>x!==key):[...c,key]);
  const toggleCampaignChannel=(key:string)=>setCampaign(c=>({...c,channels:key==="taskora"?["taskora"]:c.channels.includes(key)?c.channels.filter(x=>x!==key):[...c.channels,key]}));

  const send = async () => {
    if(!title.trim()||!message.trim()) return toast.error("Preencha título e mensagem.");
    if(audience==="selected" && selected.length===0) return toast.error("Seleccione pelo menos um utilizador.");
    if(audience==="segment" && !country.trim()) return toast.error("Indique o país do segmento.");
    if(audience==="all" && !confirm("Confirma o envio para todos os utilizadores?")) return;
    setSending(true);
    const {error}=await (supabase as any).rpc("admin_send_notification",{p_title:title.trim(),p_message:message.trim(),p_type:type,p_priority:priority,p_channels:channels,p_audience_type:audience,p_selected_user_ids:selected,p_route:null,p_metadata:audience==="segment"?{country:country.trim().toUpperCase()}:{}});
    setSending(false);
    if(error) return toast.error(error.message||"Falha no envio.");
    toast.success("Notificação criada no TASKORA."); setTitle("");setMessage("");setSelected([]);void load();
  };

  const saveTemplate = async () => {
    if(!templateName.trim()||!title.trim()||!message.trim()) return toast.error("Preencha nome, título e mensagem.");
    setSavingTemplate(true);
    const {error}=await (supabase as any).from("notification_templates").insert({name:templateName.trim(),title:title.trim(),message:message.trim(),type,channel:channels.join("+")||"taskora",active:true});
    setSavingTemplate(false); if(error) return toast.error(error.message);
    toast.success("Modelo guardado."); setTemplateName(""); void load();
  };

  const createCampaign = async () => {
    if(!campaign.name.trim()||!campaign.title.trim()||!campaign.message.trim()) return toast.error("Preencha os campos da campanha.");
    if(campaign.audience==="segment"&&!campaign.country.trim()) return toast.error("Indique o país do segmento.");
    if(campaign.audience==="selected"&&selected.length===0) return toast.error("Seleccione utilizadores para a campanha.");
    const scheduled=campaign.scheduled?new Date(campaign.scheduled).toISOString():null;
    const {error}=await (supabase as any).from("notification_campaigns").insert({
      name:campaign.name.trim(),title:campaign.title.trim(),message:campaign.message.trim(),type:campaign.type,priority:campaign.priority,
      audience_type:campaign.audience,channels:campaign.channels,audience_filter:campaign.audience==="segment"?{country:campaign.country.trim().toUpperCase()}:{},
      selected_user_ids:campaign.audience==="selected"?selected:[],scheduled_for:scheduled,status:scheduled?"scheduled":"draft",
      created_by:(await supabase.auth.getUser()).data.user?.id
    });
    if(error) return toast.error(error.message);
    toast.success(scheduled?"Campanha agendada.":"Rascunho criado.");
    setCampaign({name:"",title:"",message:"",type:"admin_message",priority:"normal",audience:"all",country:"",channels:["taskora"],scheduled:""}); setSelected([]); void load();
  };

  const cancelCampaign=async(id:string)=>{const {error}=await (supabase as any).from("notification_campaigns").update({status:"cancelled"}).eq("id",id).in("status",["draft","scheduled"]);if(error)toast.error(error.message);else{toast.success("Campanha cancelada.");void load();}};
  const sendCampaignNow=async(id:string)=>{
    if(!confirm("Confirmar envio desta campanha agora?")) return;
    const {data:c,error:cError}=await (supabase as any).from("notification_campaigns").select("*").eq("id",id).maybeSingle();
    if(cError||!c) return toast.error(cError?.message||"Campanha não encontrada.");
    const {error}=await (supabase as any).rpc("admin_send_notification",{p_title:c.title,p_message:c.message,p_type:c.type,p_priority:c.priority,p_channels:c.channels,p_audience_type:c.audience_type,p_selected_user_ids:c.selected_user_ids??[],p_route:c.route,p_metadata:c.audience_filter??{}});
    if(error) return toast.error(error.message||"Falha no envio.");
    await (supabase as any).from("notification_campaigns").update({status:"sent",sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);
    toast.success("Campanha enviada."); void load();
  };
  const useTemplate=(t:Template)=>{setTitle(t.title);setMessage(t.message);setType(t.type);setChannels(t.channel.split("+").filter(Boolean));setTab("send");};
  const groupedRules=useMemo(()=>rules.reduce((a,r)=>{(a[r.category]??=[]).push(r);return a;},{} as Record<string,Rule[]>),[rules]);

  return <div className="space-y-4">
    <AdminPageHeader title="Notificações" description="Centro de comunicação do TASKORA. A notificação interna é sempre a fonte principal." />
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="send">Enviar</TabsTrigger><TabsTrigger value="automatic">Automáticas</TabsTrigger><TabsTrigger value="channels">Canais</TabsTrigger><TabsTrigger value="templates">Modelos</TabsTrigger><TabsTrigger value="campaigns">Campanhas</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger>
      </TabsList>

      <TabsContent value="send"><div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Enviar notificação</h2><p className="text-xs text-muted-foreground">Cria primeiro a comunicação dentro do TASKORA.</p></div><Send className="h-4 w-4 text-muted-foreground"/></div>
          <Input className={inputClass} placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} maxLength={180}/>
          <Textarea className="min-h-28 rounded-lg text-sm" placeholder="Mensagem" value={message} onChange={e=>setMessage(e.target.value)} maxLength={5000}/>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className={inputClass+" rounded-lg border bg-background px-2"} value={type} onChange={e=>setType(e.target.value)}><option value="admin_message">Comunicação administrativa</option><option value="news">Novidade</option><option value="promotion">Promoção</option></select>
            <select className={inputClass+" rounded-lg border bg-background px-2"} value={priority} onChange={e=>setPriority(e.target.value)}><option value="normal">Normal</option><option value="important">Importante</option><option value="urgent">Urgente</option></select>
            <select className={inputClass+" rounded-lg border bg-background px-2"} value={audience} onChange={e=>setAudience(e.target.value)}><option value="all">Todos os utilizadores</option><option value="selected">Utilizadores seleccionados</option><option value="segment">Segmento por país</option><option value="admins">Administradores</option></select>
          </div>
          {audience==="segment"&&<Input className={inputClass} placeholder="Código do país, ex.: MZ" value={country} onChange={e=>setCountry(e.target.value)}/>}
          {audience==="selected"&&<div className="space-y-2 rounded-xl border p-3"><div className="flex gap-2"><Input className={inputClass} placeholder="Nome, email ou telefone" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchUsers()}/><Button size="sm" variant="outline" onClick={searchUsers}>Pesquisar</Button></div><div className="max-h-40 space-y-1 overflow-auto">{users.map(u=><label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted"><input type="checkbox" checked={selected.includes(u.id)} onChange={()=>setSelected(s=>s.includes(u.id)?s.filter(x=>x!==u.id):[...s,u.id])}/><span className="truncate">{u.full_name||u.email||u.phone||u.id}</span><span className="ml-auto max-w-[45%] truncate text-muted-foreground">{u.email}</span></label>)}</div></div>}
          <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Canais</p><div className="flex flex-wrap gap-2">{channelOptions.map(c=>{const Icon=c.icon;const on=channels.includes(c.key);return <button key={c.key} type="button" onClick={()=>toggleChannel(c.key)} className={"inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium "+(on?"border-primary bg-primary/10 text-primary":"text-muted-foreground")}><Icon className="h-3.5 w-3.5"/>{c.label}{on&&<Check className="h-3 w-3"/>}</button>})}</div></div>
          <Button className="h-9 rounded-lg" onClick={send} disabled={sending}>{sending?"A enviar…":"Criar e enviar"}</Button>
        </section>
        <section className="rounded-2xl border bg-card p-4 shadow-soft"><h3 className="text-sm font-semibold">Pré-visualização</h3><div className="mt-3 rounded-xl border bg-background p-3"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><Bell className="h-3.5 w-3.5"/></span><div><p className="text-xs font-semibold">{title||"Título da notificação"}</p><p className="text-[10px] text-muted-foreground">{priority==="urgent"?"Urgente":priority==="important"?"Importante":"Normal"}</p></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{message||"A mensagem aparecerá aqui."}</p></div><p className="mt-4 text-xs text-muted-foreground">Fonte principal: <strong className="text-foreground">TASKORA</strong>. Sem dados ou entregas fictícias.</p></section>
      </div></TabsContent>

      <TabsContent value="automatic"><section className="overflow-hidden rounded-2xl border bg-card shadow-soft">{Object.entries(groupedRules).map(([cat,items])=><div key={cat} className="border-b last:border-b-0"><div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</div>{items.map(r=><div key={r.rule_key} className="flex items-center gap-3 px-4 py-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Bell className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.name}</p><p className="truncate text-[11px] text-muted-foreground">{r.description}</p></div>{r.critical&&<Badge variant="outline" className="text-[10px]">Segurança</Badge>}<Switch checked={r.enabled} onCheckedChange={async v=>{const {error}=await (supabase as any).from("notification_rules").update({enabled:v,updated_at:new Date().toISOString()}).eq("rule_key",r.rule_key);if(error)toast.error(error.message);else setRules(x=>x.map(a=>a.rule_key===r.rule_key?{...a,enabled:v}:a));}}/></div>)}</div>)}{!rules.length&&!loading&&<div className="p-8 text-center text-sm text-muted-foreground">Nenhuma regra configurada.</div>}</section></TabsContent>

      <TabsContent value="channels"><div className="grid gap-3 md:grid-cols-3"><ChannelCard icon={Bell} title="TASKORA" status="Activo" desc="Centro interno e fonte principal."/><ChannelCard icon={MonitorSmartphone} title="Dispositivo" status="Condicionado" desc="Requer VAPID/Web Push configurado no backend."/><ChannelCard icon={Mail} title="Email" status="Condicionado" desc="Requer RESEND_API_KEY e remetente configurados no backend."/></div><p className="mt-3 text-xs text-muted-foreground">SMS não faz parte desta implementação e permanece separado.</p></TabsContent>

      <TabsContent value="templates"><div className="grid gap-4 lg:grid-cols-2"><section className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft"><h2 className="font-semibold">Novo modelo</h2><Input className={inputClass} placeholder="Nome do modelo" value={templateName} onChange={e=>setTemplateName(e.target.value)}/><Input className={inputClass} placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)}/><Textarea className="min-h-24 rounded-lg text-sm" placeholder={'Mensagem. Variáveis: {{nome}}, {{valor}}, {{referencia}}'} value={message} onChange={e=>setMessage(e.target.value)}/><Button size="sm" onClick={saveTemplate} disabled={savingTemplate}><Save className="mr-1.5 h-4 w-4"/>{savingTemplate?"A guardar…":"Guardar modelo"}</Button></section><section className="overflow-hidden rounded-2xl border bg-card shadow-soft">{templates.map(t=><div key={t.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0"><Megaphone className="h-4 w-4 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="text-sm font-medium">{t.name}</p><p className="truncate text-xs text-muted-foreground">{t.title}</p></div><Switch checked={t.active} onCheckedChange={async v=>{const {error}=await (supabase as any).from("notification_templates").update({active:v,updated_at:new Date().toISOString()}).eq("id",t.id);if(error)toast.error(error.message);else setTemplates(x=>x.map(a=>a.id===t.id?{...a,active:v}:a));}}/><Button size="sm" variant="outline" onClick={()=>useTemplate(t)} disabled={!t.active}>Usar</Button></div>)}{!templates.length&&<div className="p-8 text-center text-sm text-muted-foreground">Nenhum modelo guardado.</div>}</section></div></TabsContent>

      <TabsContent value="campaigns"><div className="grid gap-4 lg:grid-cols-[1fr_360px]"><section className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft"><h2 className="font-semibold">Campanha</h2><Input className={inputClass} placeholder="Nome interno" value={campaign.name} onChange={e=>setCampaign(c=>({...c,name:e.target.value}))}/><Input className={inputClass} placeholder="Título" value={campaign.title} onChange={e=>setCampaign(c=>({...c,title:e.target.value}))}/><Textarea className="min-h-24 rounded-lg text-sm" placeholder="Mensagem" value={campaign.message} onChange={e=>setCampaign(c=>({...c,message:e.target.value}))}/><div className="grid gap-2 sm:grid-cols-2"><select className={inputClass+" rounded-lg border bg-background px-2"} value={campaign.audience} onChange={e=>setCampaign(c=>({...c,audience:e.target.value}))}><option value="all">Todos</option><option value="selected">Seleccionados</option><option value="segment">Segmento</option><option value="admins">Administradores</option></select><select className={inputClass+" rounded-lg border bg-background px-2"} value={campaign.priority} onChange={e=>setCampaign(c=>({...c,priority:e.target.value}))}><option value="normal">Normal</option><option value="important">Importante</option><option value="urgent">Urgente</option></select></div>{campaign.audience==="segment"&&<Input className={inputClass} placeholder="País, ex.: MZ" value={campaign.country} onChange={e=>setCampaign(c=>({...c,country:e.target.value}))}/>}{campaign.audience==="selected"&&<div className="space-y-2 rounded-xl border p-3"><div className="flex gap-2"><Input className={inputClass} placeholder="Pesquisar utilizadores" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchUsers()}/><Button size="sm" variant="outline" onClick={searchUsers}>Pesquisar</Button></div><div className="max-h-32 space-y-1 overflow-auto">{users.map(u=><label key={u.id} className="flex items-center gap-2 px-2 py-1 text-xs"><input type="checkbox" checked={selected.includes(u.id)} onChange={()=>setSelected(x=>x.includes(u.id)?x.filter(id=>id!==u.id):[...x,u.id])}/><span className="truncate">{u.full_name||u.email||u.phone||u.id}</span></label>)}</div></div>}<div className="flex flex-wrap gap-2">{channelOptions.map(c=>{const Icon=c.icon;const on=campaign.channels.includes(c.key);return <button key={c.key} type="button" onClick={()=>toggleCampaignChannel(c.key)} className={"inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs "+(on?"border-primary bg-primary/10 text-primary":"text-muted-foreground")}><Icon className="h-3 w-3"/>{c.label}</button>})}</div><label className="block text-xs text-muted-foreground">Agendar<input type="datetime-local" className={inputClass+" mt-1 w-full border bg-background px-2"} value={campaign.scheduled} onChange={e=>setCampaign(c=>({...c,scheduled:e.target.value}))}/></label><Button size="sm" onClick={createCampaign}><Clock3 className="mr-1.5 h-4 w-4"/>{campaign.scheduled?"Agendar campanha":"Guardar rascunho"}</Button></section><section className="overflow-hidden rounded-2xl border bg-card shadow-soft"><div className="border-b px-4 py-3"><h3 className="text-sm font-semibold">Campanhas</h3></div>{campaigns.map(c=><div key={c.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{c.name}</p><p className="text-[11px] text-muted-foreground">{c.status}{c.scheduled_for?" · "+new Date(c.scheduled_for).toLocaleString("pt-PT"):""}</p></div><Badge variant="outline" className="text-[10px]">{c.audience_type}</Badge>{c.status==="draft"&&<Button size="sm" variant="outline" onClick={()=>sendCampaignNow(c.id)}>Enviar</Button>}{["draft","scheduled"].includes(c.status)&&<Button size="sm" variant="ghost" onClick={()=>cancelCampaign(c.id)}>Cancelar</Button>}</div>)}{!campaigns.length&&<div className="p-8 text-center text-sm text-muted-foreground">Nenhuma campanha registada.</div>}</section></div></TabsContent>

      <TabsContent value="history"><section className="overflow-hidden rounded-2xl border bg-card shadow-soft"><div className="grid grid-cols-[1fr_70px_70px_115px] gap-2 border-b px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><span>Acção</span><span>Dest.</span><span>Criadas</span><span>Data</span></div>{logs.map(l=><div key={l.id} className="grid grid-cols-[1fr_70px_70px_115px] gap-2 border-b px-4 py-3 text-xs last:border-0"><span><p className="font-medium">{l.action}</p><p className="text-[10px] text-muted-foreground">{l.channels?.join(" + ")||"TASKORA"} · {l.result}</p></span><span>{l.recipient_count}</span><span>{l.sent_count}</span><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-PT")}</span></div>)}{!logs.length&&<div className="p-8 text-center text-sm text-muted-foreground">Nenhum envio registado.</div>}</section></TabsContent>
    </Tabs>
  </div>;
}

function ChannelCard({icon:Icon,title,status,desc}:{icon:any;title:string;status:string;desc:string}) {
 return <section className="rounded-2xl border bg-card p-4 shadow-soft"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4"/></span><div><p className="text-sm font-semibold">{title}</p><p className="text-[11px] text-muted-foreground">{status}</p></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{desc}</p></section>;
}
