import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Clock3, Loader2, LockKeyhole, MonitorSmartphone, RefreshCw, Shield, ShieldAlert, ToggleLeft, ToggleRight, UserRound } from "lucide-react";
import { toast } from "sonner";

type Rule={id:string;rule_key:string;name:string;description:string;enabled:boolean;configuration:Record<string,unknown>};
type Account={id:string;user_id:string;reason:string;status:string;created_at:string;reviewed_at:string|null};
type Event={id:string;user_id:string|null;event_type:string;success:boolean;device:string|null;browser:string|null;created_at:string};
type Alert={id:string;alert_type:string;severity:string;title:string;description:string;status:string;created_at:string};
type Audit={id:string;admin_user_id:string|null;action:string;area:string;resource_type:string|null;resource_id:string|null;result:string;created_at:string};
type Session={id:string;user_id:string;device:string|null;browser:string|null;created_at:string;last_activity_at:string;revoked_at:string|null};

export const Route=createFileRoute("/admin/security")({
  ssr:false,
  head:()=>({meta:[
    {title:"Segurança — Admin Taskora"},
    {name:"robots",content:"noindex"},
    {name:"description",content:"Segurança administrativa, anti-fraude, autenticação, sessões e auditoria."},
  ]}),
  component:Page,
});

function Page(){
  const [rules,setRules]=useState<Rule[]>([]);
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [events,setEvents]=useState<Event[]>([]);
  const [alerts,setAlerts]=useState<Alert[]>([]);
  const [audit,setAudit]=useState<Audit[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [mfa,setMfa]=useState<Array<{id:string;status:string;factor_type:string;friendly_name?:string|null}>>([]);
  const [mfaBusy,setMfaBusy]=useState(false);
  const [mfaSetup,setMfaSetup]=useState<{id:string;qr:string;secret:string}|null>(null);
  const [mfaCode,setMfaCode]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [r1,r2,r3,r4,r5,r6]=await Promise.all([
        supabase.from("security_fraud_rules").select("id,rule_key,name,description,enabled,configuration").order("created_at"),
        supabase.from("security_suspicious_accounts").select("id,user_id,reason,status,created_at,reviewed_at").in("status",["flagged","reviewed","blocked"]).order("created_at",{ascending:false}).limit(50),
        supabase.from("security_access_events").select("id,user_id,event_type,success,device,browser,created_at").order("created_at",{ascending:false}).limit(50),
        supabase.from("security_alerts").select("id,alert_type,severity,title,description,status,created_at").in("status",["open","acknowledged"]).order("created_at",{ascending:false}).limit(50),
        supabase.from("security_audit_log").select("id,admin_user_id,action,area,resource_type,resource_id,result,created_at").order("created_at",{ascending:false}).limit(50),
        supabase.from("security_admin_sessions").select("id,user_id,device,browser,created_at,last_activity_at,revoked_at").is("revoked_at",null).order("last_activity_at",{ascending:false}).limit(50),
      ]);
      const failed=[r1,r2,r3,r4,r5,r6].find(x=>x.error);
      if(failed?.error) throw failed.error;
      setRules((r1.data??[]) as Rule[]);
      setAccounts((r2.data??[]) as Account[]);
      setEvents((r3.data??[]) as Event[]);
      setAlerts((r4.data??[]) as Alert[]);
      setAudit((r5.data??[]) as Audit[]);
      setSessions((r6.data??[]) as Session[]);
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível carregar a segurança.");}
    finally{setLoading(false);}
  },[]);

  const loadMfa=useCallback(async()=>{
    try{
      const {data,error}=await supabase.auth.mfa.listFactors();
      if(error) throw error;
      setMfa(data.all??[]);
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível verificar o 2FA.");}
  },[]);

  useEffect(()=>{void load();void loadMfa();},[load,loadMfa]);

  const activeMfa=useMemo(()=>mfa.filter(x=>x.factor_type==="totp"&&x.status==="verified"),[mfa]);

  async function saveRuleConfig(rule:Rule, configuration:Record<string,unknown>){
    setBusy(rule.id+"-config");
    try{
      const {error}=await supabase.from("security_fraud_rules").update({configuration,updated_by:(await supabase.auth.getUser()).data.user?.id??null}).eq("id",rule.id);
      if(error) throw error;
      await supabase.rpc("write_security_audit",{p_action:"alterou configuração de regra anti-fraude",p_area:"Segurança",p_resource_type:"fraud_rule",p_resource_id:rule.id,p_metadata:{rule_key:rule.rule_key}});
      setRules(x=>x.map(r=>r.id===rule.id?{...r,configuration}:r));
      toast.success("Configuração guardada.");
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível guardar a configuração.");}
    finally{setBusy(null);}
  }

  async function toggleRule(rule:Rule){
    setBusy(rule.id);
    try{
      const user=(await supabase.auth.getUser()).data.user;
      const {error}=await supabase.from("security_fraud_rules").update({enabled:!rule.enabled,updated_by:user?.id??null}).eq("id",rule.id);
      if(error) throw error;
      await supabase.rpc("write_security_audit",{p_action:rule.enabled?"desactivou regra anti-fraude":"activou regra anti-fraude",p_area:"Segurança",p_resource_type:"fraud_rule",p_resource_id:rule.id,p_metadata:{rule_key:rule.rule_key}});
      setRules(x=>x.map(r=>r.id===rule.id?{...r,enabled:!rule.enabled}:r));
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível alterar a regra.");}
    finally{setBusy(null);}
  }

  async function reviewAccount(account:Account,status:"reviewed"|"cleared"){
    setBusy(account.id);
    try{
      const user=(await supabase.auth.getUser()).data.user;
      const {error}=await supabase.from("security_suspicious_accounts").update({status,reviewed_by:user?.id??null,reviewed_at:new Date().toISOString()}).eq("id",account.id);
      if(error) throw error;
      await supabase.rpc("write_security_audit",{p_action:status==="cleared"?"removeu sinalização de conta suspeita":"marcou conta suspeita como analisada",p_area:"Segurança",p_resource_type:"user",p_resource_id:account.user_id});
      await load();
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível actualizar a conta.");}
    finally{setBusy(null);}
  }

  async function revokeSession(session:Session){
    setBusy(session.id);
    try{
      const {error}=await supabase.rpc("revoke_security_session",{p_session_id:session.id});
      if(error) throw error;
      await supabase.rpc("write_security_audit",{p_action:"terminou sessão administrativa",p_area:"Segurança",p_resource_type:"admin_session",p_resource_id:session.id});
      await load();
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível terminar a sessão.");}
    finally{setBusy(null);}
  }

  async function enableMfa(){
    setMfaBusy(true);
    try{
      const {data,error}=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"Taskora Admin"});
      if(error) throw error;
      if(!data?.id||!data.totp?.qr_code||!data.totp?.secret) throw new Error("Não foi possível preparar o autenticador.");
      setMfaSetup({id:data.id,qr:data.totp.qr_code,secret:data.totp.secret});
      setMfaCode("");
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível preparar o 2FA.");}
    finally{setMfaBusy(false);}
  }

  async function confirmMfa(){
    if(!mfaSetup||!/^[0-9]{6}$/.test(mfaCode)) return;
    setMfaBusy(true);
    try{
      const challenge=await supabase.auth.mfa.challenge({factorId:mfaSetup.id});
      if(challenge.error) throw challenge.error;
      const verified=await supabase.auth.mfa.verify({factorId:mfaSetup.id,challengeId:challenge.data.id,code:mfaCode});
      if(verified.error) throw verified.error;
      await supabase.rpc("write_security_audit",{p_action:"activou 2FA",p_area:"Segurança",p_resource_type:"admin_account"});
      toast.success("2FA activado com sucesso.");
      setMfaSetup(null);
      setMfaCode("");
      await loadMfa();
    }catch(e){toast.error(e instanceof Error?e.message:"Código 2FA inválido.");}
    finally{setMfaBusy(false);}
  }
  async function disableMfa(id:string){
    setMfaBusy(true);
    try{
      const aal=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if(aal.error) throw aal.error;
      if(aal.data.currentLevel!=="aal2") throw new Error("Para desactivar o 2FA, conclui primeiro uma autenticação de nível 2.");
      const {error}=await supabase.auth.mfa.unenroll({factorId:id});
      if(error) throw error;
      await supabase.rpc("write_security_audit",{p_action:"desactivou 2FA",p_area:"Segurança",p_resource_type:"admin_account"});
      toast.success("2FA desactivado.");
      await loadMfa();
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível desactivar o 2FA.");}
    finally{setMfaBusy(false);}
  }

  return <div className="space-y-6">
    <AdminPageHeader title="Segurança" description="Controlo administrativo, anti-fraude, autenticação, sessões, alertas e auditoria." />

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Summary label="Regras activas" value={String(rules.filter(x=>x.enabled).length)} icon={<Shield className="h-4 w-4"/>}/>
      <Summary label="Contas sinalizadas" value={String(accounts.filter(x=>x.status==="flagged").length)} icon={<ShieldAlert className="h-4 w-4"/>}/>
      <Summary label="Alertas abertos" value={String(alerts.length)} icon={<AlertCircle className="h-4 w-4"/>}/>
      <Summary label="Sessões administrativas" value={String(sessions.length)} icon={<MonitorSmartphone className="h-4 w-4"/>}/>
    </div>

    <Section title="Regras anti-fraude" icon={<Shield className="h-5 w-5"/>} description="Regras configuráveis. Só as regras activadas devem produzir acções no backend.">
      <div className="grid gap-3 md:grid-cols-2">{rules.map(rule=><div key={rule.id} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{rule.name}</p><p className="mt-1 text-sm text-muted-foreground">{rule.description}</p></div><button type="button" onClick={()=>void toggleRule(rule)} disabled={busy===rule.id} className="rounded-lg p-1 text-muted-foreground hover:text-foreground disabled:opacity-50">{busy===rule.id?<Loader2 className="h-5 w-5 animate-spin"/>:rule.enabled?<ToggleRight className="h-6 w-6 text-primary"/>:<ToggleLeft className="h-6 w-6"/>}</button></div><p className="mt-3 text-xs text-muted-foreground">Estado: <strong>{rule.enabled?"Activada":"Desactivada"}</strong></p><RuleConfiguration rule={rule} busy={busy} onSave={saveRuleConfig}/></div>)}</div>
    </Section>

    <Section title="Contas suspeitas" icon={<UserRound className="h-5 w-5"/>} description="Somente sinalizações reais são apresentadas.">
      {accounts.length===0?<Empty text="Nenhuma conta está actualmente sinalizada."/>:<div className="space-y-2">{accounts.map(a=><div key={a.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{a.user_id}</p><p className="mt-1 text-sm text-muted-foreground">{a.reason}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(a.created_at)} · {a.status}</p></div>{a.status==="flagged"&&<div className="flex gap-2"><button type="button" onClick={()=>void reviewAccount(a,"reviewed")} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Marcar analisada</button><button type="button" onClick={()=>void reviewAccount(a,"cleared")} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Remover sinalização</button></div>}</div>)}</div>}
    </Section>

    <Section title="Tentativas de acesso" icon={<LockKeyhole className="h-5 w-5"/>} description="Login, recuperação e alterações de autenticação registados pelo sistema.">
      {events.length===0?<Empty text="Nenhum evento de acesso registado."/>:<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-2 py-2">Data/hora</th><th className="px-2 py-2">Utilizador</th><th className="px-2 py-2">Evento</th><th className="px-2 py-2">Dispositivo</th><th className="px-2 py-2">Navegador</th><th className="px-2 py-2">Estado</th></tr></thead><tbody>{events.map(e=><tr key={e.id} className="border-b border-border/60"><td className="px-2 py-2.5">{formatDate(e.created_at)}</td><td className="px-2 py-2.5">{e.user_id??"—"}</td><td className="px-2 py-2.5">{eventLabel(e.event_type)}</td><td className="px-2 py-2.5">{e.device??"—"}</td><td className="px-2 py-2.5">{e.browser??"—"}</td><td className="px-2 py-2.5">{e.success?"Sucesso":"Falhado"}</td></tr>)}</tbody></table></div>}
    </Section>

    <Section title="Autenticação de dois fatores (2FA)" icon={<LockKeyhole className="h-5 w-5"/>} description="TOTP para a conta administrativa actualmente autenticada.">
      {activeMfa.length===0 ? (
        mfaSetup ? (
          <div className="rounded-xl border border-border p-4">
            <p className="font-semibold">Adicionar autenticador</p>
            <p className="mt-1 text-sm text-muted-foreground">Digitaliza o QR Code no teu aplicativo autenticador. Se não conseguires, usa a chave secreta.</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <img src={"data:image/svg+xml;utf8,"+encodeURIComponent(mfaSetup.qr)} alt="QR Code para configurar 2FA" className="h-44 w-44 rounded-xl border border-border bg-white p-2"/>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Chave secreta</p>
                <p className="mt-1 break-all rounded-lg bg-muted p-2 font-mono text-xs">{mfaSetup.secret}</p>
                <label className="mt-3 block text-xs font-medium text-muted-foreground">Código de confirmação
                  <input value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-center text-lg tracking-[0.3em]"/>
                </label>
                <button type="button" onClick={()=>void confirmMfa()} disabled={mfaBusy||mfaCode.length!==6} className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{mfaBusy?"A verificar…":"Confirmar e activar"}</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">2FA não configurado nesta conta</p>
              <p className="mt-1 text-sm text-muted-foreground">A activação só termina depois da validação do código do autenticador.</p>
            </div>
            <button type="button" onClick={()=>void enableMfa()} disabled={mfaBusy} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{mfaBusy?"A preparar…":"Configurar 2FA"}</button>
          </div>
        )
      ) : activeMfa.map(f=>
        <div key={f.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold">2FA activo</p><p className="mt-1 text-sm text-muted-foreground">{f.friendly_name??"Aplicativo autenticador"} · factor verificado</p></div>
          <button type="button" onClick={()=>void disableMfa(f.id)} disabled={mfaBusy} className="rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-semibold text-destructive">Desactivar 2FA</button>
        </div>
      )}
    </Section>

    <Section title="Permissões administrativas" icon={<Shield className="h-5 w-5"/>} description="Estrutura preparada para níveis futuros, sem alterar os administradores actuais.">
      <div className="grid gap-3 md:grid-cols-3">{["Super Admin","Admin","Moderador"].map(role=><div key={role} className="rounded-xl border border-border p-4"><p className="font-semibold">{role}</p><p className="mt-1 text-xs text-muted-foreground">Permissões por área preparadas no backend.</p></div>)}</div>
    </Section>

    <Section title="Bloqueios automáticos" icon={<ShieldAlert className="h-5 w-5"/>} description="Bloqueios só devem ser criados por regras activadas ou acções administrativas reais.">
      <Empty text="Nenhum bloqueio activo registado."/>
    </Section>

    <Section title="Sessões e dispositivos" icon={<MonitorSmartphone className="h-5 w-5"/>} description="Sessões administrativas registadas pelo sistema.">
      {sessions.length===0?<Empty text="Nenhuma sessão administrativa registada."/>:<div className="space-y-2">{sessions.map(s=><div key={s.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{s.device??"Dispositivo não identificado"}</p><p className="mt-1 text-sm text-muted-foreground">{s.browser??"Navegador não identificado"} · Última actividade: {formatDate(s.last_activity_at)}</p><p className="mt-1 text-xs text-muted-foreground">Iniciada: {formatDate(s.created_at)}</p></div><button type="button" onClick={()=>void revokeSession(s)} disabled={busy===s.id} className="rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive">Terminar sessão</button></div>)}</div>}
    </Section>

    <Section title="Alertas de segurança" icon={<AlertCircle className="h-5 w-5"/>} description="Somente alertas efectivamente registados.">
      {alerts.length===0?<Empty text="Nenhum alerta de segurança aberto."/>:<div className="space-y-2">{alerts.map(a=><div key={a.id} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{a.title}</p><span className="text-xs font-semibold uppercase">{a.severity}</span></div><p className="mt-1 text-sm text-muted-foreground">{a.description}</p><p className="mt-2 text-xs text-muted-foreground">{formatDate(a.created_at)} · {a.status}</p></div>)}</div>}
    </Section>

    <Section title="Registo de auditoria" icon={<Clock3 className="h-5 w-5"/>} description="Acções administrativas sem palavras-passe, API Keys, tokens ou outros secrets.">
      {audit.length===0?<Empty text="Nenhuma acção administrativa registada."/>:<div className="space-y-2">{audit.map(a=><div key={a.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center gap-2"><strong>{a.admin_user_id??"Administrador"}</strong><span>→</span><span>{a.action}</span></div><p className="mt-1 text-sm text-muted-foreground">{a.area} · {formatDate(a.created_at)} · {a.result}{a.resource_type?" · "+a.resource_type+(a.resource_id?"/"+a.resource_id:""):""}</p></div>)}</div>}
    </Section>

    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground"><span>Dados administrativos protegidos por RLS e verificações no backend.</span><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 font-semibold hover:text-foreground"><RefreshCw className={loading?"h-3.5 w-3.5 animate-spin":"h-3.5 w-3.5"}/>Actualizar</button></div>
  </div>;
}

function Section({title,icon,description,children}:{title:string;icon:React.ReactNode;description:string;children:React.ReactNode}){return <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="mt-0.5 text-muted-foreground">{icon}</span><div className="flex-1"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div><div className="mt-5">{children}</div></section>;}
function Summary({label,value,icon}:{label:string;value:string;icon:React.ReactNode}){return <div className="rounded-xl border border-border bg-card p-3.5"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-1 text-xl font-semibold">{value}</p></div>;}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">{text}</div>;}
function RuleConfiguration({rule,busy,onSave}:{rule:Rule;busy:string|null;onSave:(rule:Rule,configuration:Record<string,unknown>)=>Promise<void>}){
  const threshold=typeof rule.configuration.threshold==="number"?String(rule.configuration.threshold):"";
  const windowMinutes=typeof rule.configuration.window_minutes==="number"?String(rule.configuration.window_minutes):"";
  if(!("threshold" in rule.configuration)&&!("window_minutes" in rule.configuration)) return null;
  return <div className="mt-4 grid gap-2 sm:grid-cols-2">
    {"threshold" in rule.configuration&&<label className="text-xs text-muted-foreground">Limite<input defaultValue={threshold} type="number" min="1" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" onBlur={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>0&&n!==Number(threshold))void onSave(rule,{...rule.configuration,threshold:n});}}/></label>}
    {"window_minutes" in rule.configuration&&<label className="text-xs text-muted-foreground">Janela (minutos)<input defaultValue={windowMinutes} type="number" min="1" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" onBlur={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>0&&n!==Number(windowMinutes))void onSave(rule,{...rule.configuration,window_minutes:n});}}/></label>}
    {busy===rule.id+"-config"&&<span className="text-xs text-muted-foreground sm:col-span-2">A guardar…</span>}
  </div>;
}
function eventLabel(v:string){const m:Record<string,string>={login_success:"Login bem-sucedido",login_failed:"Login falhado",account_recovery:"Recuperação de conta",authentication_change:"Alteração de autenticação",password_change:"Alteração de palavra-passe",two_factor_enabled:"2FA activado",two_factor_disabled:"2FA desactivado"};return m[v]??v;}
function formatDate(v:string|null){if(!v)return "—";const d=new Date(v);if(Number.isNaN(d.getTime()))return "—";return new Intl.DateTimeFormat("pt-PT",{dateStyle:"medium",timeStyle:"short"}).format(d);}
