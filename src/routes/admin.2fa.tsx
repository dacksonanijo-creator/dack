import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
// Security tables/functions are not yet in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { isAdminEmail } from "@/lib/admin";
import { toast } from "sonner";

export const Route=createFileRoute("/admin/2fa")({
  ssr:false,
  beforeLoad:async()=>{
    const {data,error}=await supabase.auth.getUser();
    if(error||!data.user) throw redirect({to:"/login"});
    if(!isAdminEmail(data.user.email)) throw redirect({to:"/app"});
  },
  component:VerifyTwoFactor,
});

function VerifyTwoFactor(){
  const navigate=useNavigate();
  const [factorId,setFactorId]=useState<string|null>(null);
  const [code,setCode]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    void (async()=>{
      try{
        const {data,error}=await supabase.auth.mfa.listFactors();
        if(error) throw error;
        const factor=(data.all??[]).find(x=>x.factor_type==="totp"&&x.status==="verified");
        if(!factor) return navigate({to:"/admin",replace:true});
        setFactorId(factor.id);
      }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível verificar o 2FA.");}
      finally{setLoading(false);}
    })();
  },[navigate]);

  async function verify(){
    if(!factorId||!/^[0-9]{6}$/.test(code)) return;
    setBusy(true);
    try{
      const challenge=await supabase.auth.mfa.challenge({factorId});
      if(challenge.error) throw challenge.error;
      const result=await supabase.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});
      if(result.error) throw result.error;
      await db.rpc("write_security_audit",{p_action:"concluiu autenticação 2FA",p_area:"Segurança",p_resource_type:"admin_session"});
      await navigate({to:"/admin",replace:true});
    }catch(e){toast.error(e instanceof Error?e.message:"Código 2FA inválido.");}
    finally{setBusy(false);}
  }

  if(loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin"/></div>;

  return <div className="min-h-screen grid place-items-center bg-muted/20 p-4">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6"/></div>
      <h1 className="mt-4 text-center text-xl font-semibold">Verificação de segurança</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Introduz o código do teu aplicativo autenticador para aceder ao painel administrativo.</p>
      <div className="mt-6">
        <label className="text-sm font-medium">Código 2FA</label>
        <div className="relative mt-2">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-center text-lg tracking-[0.35em] outline-none focus:border-primary" placeholder="000000" />
        </div>
      </div>
      <button type="button" onClick={()=>void verify()} disabled={busy||code.length!==6} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {busy&&<Loader2 className="h-4 w-4 animate-spin"/>} Verificar e continuar
      </button>
    </div>
  </div>;
}
