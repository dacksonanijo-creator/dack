import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import {
  approveAdminWithdrawal, cancelAdminWithdrawal, getAdminWithdrawalReconciliation, getAdminWithdrawalRules, getAdminWithdrawalSummary,
  listAdminWithdrawals, processAdminWithdrawal, rejectAdminWithdrawal,
  retryAdminWithdrawal, reverseAdminWithdrawal, reviewAdminWithdrawal, saveAdminWithdrawalRule,
} from "@/lib/payouts/admin.functions";
import { CheckCircle2, Clock3, RefreshCw, Search, ShieldAlert, WalletCards, XCircle } from "lucide-react";

type WithdrawalRow = {
  id:string; reference:string|null; user_id:string; user_name:string; user_email:string|null;
  amount:number; currency:string; method:string; destination_masked:string; created_at:string;
  status:string; transaction_id:string|null; reservation_id:string|null; provider:string|null;
  failure_reason:string|null; rejection_reason:string|null; approved_at:string|null; processed_at:string|null;
};
type Rule = {
  id:string; country:string; method:string; currency:string; enabled:boolean; min_amount:number;
  max_amount:number; daily_limit:number|null; weekly_limit:number|null; monthly_limit:number|null;
  max_requests_per_day:number; fee:number;
};
type Reconciliation = { currency:string; reserved_ledger:number; withdrawal_reserved:number; provider_paid:number; withdrawal_paid:number; divergence:number; status:string };

export const Route = createFileRoute("/admin/withdrawals")({
  head: () => ({ meta: [
    { title: "Saques — Admin Taskora" }, { name:"robots",content:"noindex" },
    { name:"description",content:"Gestão real de levantamentos, payouts, limites e reconciliação." },
  ]}),
  component: Page,
});

const STATUS_LABEL: Record<string,string> = {
  pending:"Pendente", review:"Revisão", approved:"Aprovado", processing:"Em processamento",
  paid:"Pago", failed:"Falhou", rejected:"Rejeitado", cancelled:"Cancelado", reversed:"Revertido",
};

function Page() {
  const listFn=useServerFn(listAdminWithdrawals);\n  const summaryFn=useServerFn(getAdminWithdrawalSummary);
  const approveFn=useServerFn(approveAdminWithdrawal);
  const rejectFn=useServerFn(rejectAdminWithdrawal);
  const reviewFn=useServerFn(reviewAdminWithdrawal);
  const processFn=useServerFn(processAdminWithdrawal);
  const retryFn=useServerFn(retryAdminWithdrawal);
  const rulesFn=useServerFn(getAdminWithdrawalRules);
  const saveRuleFn=useServerFn(saveAdminWithdrawalRule);
  const reconFn=useServerFn(getAdminWithdrawalReconciliation);

  const [rows,setRows]=useState<WithdrawalRow[]>([]);
  const [rules,setRules]=useState<Rule[]>([]);
  const [recon,setRecon]=useState<Reconciliation[]>([]);\n  const [summary,setSummary]=useState<Record<string,{count:number;amount:number}>>({});
  const [status,setStatus]=useState("pending");
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState<string[]>([]);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [reason,setReason]=useState("");
  const [reasonMode,setReasonMode]=useState<"reject"|"review"|"cancel"|null>(null);
  const [reasonId,setReasonId]=useState<string|null>(null);\n  const [reverseId,setReverseId]=useState<string|null>(null);\n  const [reverseTx,setReverseTx]=useState("");
  const [showRules,setShowRules]=useState(false);
  const [showRecon,setShowRecon]=useState(false);

  const load=useCallback(async()=>{
    setError(null);
    try {
      const [r,rr,rc]=await Promise.all([
        listFn({data:{status:status||null,search}}),
        rulesFn(),
        reconFn(),
      ]);
      setRows(r as WithdrawalRow[]);\n      const summaryMap:Record<string,{count:number;amount:number}>={};\n      for(const item of (rr as any[])) summaryMap[item.status]={count:Number(item.count),amount:Number(item.amount)};\n      setSummary(summaryMap);\n      setRules((await rulesFn()) as Rule[]); setRecon(rc as Reconciliation[]);
      setSelected([]);
    } catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar os saques.");}
  },[listFn,summaryFn,rulesFn,reconFn,status,search]);

  useEffect(()=>{void load();},[load]);

  const counts=useMemo(()=>{
    const c:Record<string,number>={pending:0,processing:0,paid:0,failed:0,rejected:0};
    for(const r of rows) if(r.status in c)c[r.status]++;
    return c;
  },[rows]);

  const eligible=rows.filter(r=>r.status==="approved");
  const selectedRows=rows.filter(r=>selected.includes(r.id));
  const totalSelected=selectedRows.reduce((s,r)=>s+Number(r.amount),0);

  const act=async(id:string,fn:()=>Promise<unknown>,success:string)=>{
    setBusy(id);setError(null);setMessage(null);
    try{await fn();setMessage(success);await load();}catch(e){setError(e instanceof Error?e.message:"Operação não concluída.");}finally{setBusy(null);}
  };

  const requestReason=(id:string,mode:"reject"|"review"|"cancel")=>{setReasonId(id);setReasonMode(mode);setReason("");};

  const confirmReverse=async()=>{
    if(!reverseId||reverseTx.trim().length<2||reason.trim().length<3)return;
    const id=reverseId, tx=reverseTx.trim(), text=reason.trim();
    setReverseId(null);setReverseTx("");setReason("");
    await act(id,()=>reverseAdminWithdrawal({data:{id,providerTransactionId:tx,reason:text}}),"Reversão registada no ledger e no histórico.");
  };

  const confirmReason=async()=>{
    if(!reasonId||!reasonMode||reason.trim().length<3)return;
    const id=reasonId, mode=reasonMode, text=reason.trim();
    setReasonId(null);setReasonMode(null);
    await act(id,()=>mode==="reject"?rejectFn({data:{id,reason:text}}):mode==="cancel"?cancelAdminWithdrawal({data:{id,reason:text}}):reviewFn({data:{id,reason:text}}),mode==="reject"?"Pedido rejeitado e reserva libertada.":mode==="cancel"?"Pedido cancelado e reserva libertada.":"Pedido enviado para revisão.");
  };

  const processOne=(id:string)=>act(id,async()=>{
    const result=await processFn({data:{id,mode:"send"}});
    if(!result.ok)throw new Error(result.error==="provider_not_configured"?"Provedor não configurado":result.detail||"Payout não processado.");
  },"Payout enviado ao provedor; o estado só será PAID após confirmação real.");

  const processBatch=async()=>{
    if(selectedRows.length===0)return;
    setBusy("batch");setError(null);setMessage(null);
    let failed=0;
    for(const row of selectedRows){
      const result=await processFn({data:{id:row.id,mode:"send"}});
      if(!result.ok)failed++;
    }
    setMessage(failed?("Lote concluído parcialmente: "+(selectedRows.length-failed)+" processado(s), "+failed+" excluído(s)/falhado(s)."):(selectedRows.length+" pedido(s) enviado(s) individualmente."));
    setBusy(null);await load();
  };

  return <div className="space-y-6">
    <AdminPageHeader title="Saques" description="Pedidos de levantamento, reservas no ledger, payouts e reconciliação." />

    {error&&<div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><XCircle className="mt-0.5 h-4 w-4"/><span>{error}</span></div>}
    {message&&<div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4"/><span>{message}</span></div>}

    <section className="grid gap-2 grid-cols-2 sm:grid-cols-5">
      {[["Pendentes",counts.pending],["Em processamento",counts.processing],["Pagos",counts.paid],["Falhados",counts.failed],["Rejeitados",counts.rejected]].map(([label,value])=>
        <div key={String(label)} className="rounded-xl border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>
      )}
    </section>

    <section className="rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {["pending","review","approved","processing","paid","failed","rejected","reversed"].map(s=>
            <button key={s} onClick={()=>setStatus(s)} className={s===status?"rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground":"rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"}>{STATUS_LABEL[s]}</button>
          )}
          <button onClick={()=>setStatus("")} className={status===""?"rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground":"rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"}>Todos</button>
        </div>
        <div className="flex gap-2">
          <div className="flex min-w-56 items-center gap-2 rounded-lg border border-border px-3"><Search className="h-4 w-4 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void load()} placeholder="ID, referência, email…" className="w-full bg-transparent py-2 text-sm outline-none"/></div>
          <button onClick={()=>void load()} className="rounded-lg border border-border p-2.5 hover:bg-muted" title="Actualizar"><RefreshCw className="h-4 w-4"/></button>
        </div>
      </div>

      {status==="pending"&&rows.length===0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum pedido de levantamento pendente.</div> :
      rows.length===0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm">
        <thead><tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
          <th className="px-4 py-3"><input type="checkbox" checked={selectedRows.length>0&&selectedRows.length===eligible.length} onChange={e=>setSelected(e.target.checked?eligible.map(r=>r.id):[])}/></th>
          <th className="px-3 py-3">Pedido</th><th className="px-3 py-3">Utilizador</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3">Método / destino</th><th className="px-3 py-3">Data</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Acções</th>
        </tr></thead>
        <tbody>{rows.map(r=><tr key={r.id} className="border-b border-border/50 last:border-0">
          <td className="px-4 py-3">{r.status==="approved"?<input type="checkbox" checked={selected.includes(r.id)} onChange={e=>setSelected(v=>e.target.checked?[...v,r.id]:v.filter(x=>x!==r.id))}/>:null}</td>
          <td className="px-3 py-3"><div className="font-mono text-xs">{r.reference||r.id.slice(0,8)}</div><div className="text-[11px] text-muted-foreground">{r.id}</div><div className="text-[10px] text-muted-foreground">Reserva: {r.reservation_id ? r.reservation_id.slice(0,8) : "—"} · Tx: {r.transaction_id ? r.transaction_id : "—"}</div></td>
          <td className="px-3 py-3"><div className="font-medium">{r.user_name}</div><div className="text-xs text-muted-foreground">{r.user_email||"—"}</div></td>
          <td className="px-3 py-3 font-semibold">{Number(r.amount).toLocaleString("pt-PT")} {r.currency}</td>
          <td className="px-3 py-3"><div className="font-medium">{r.method}</div><div className="text-xs text-muted-foreground">{r.destination_masked}</div></td>
          <td className="px-3 py-3 text-xs">{new Date(r.created_at).toLocaleString("pt-PT")}</td>
          <td className="px-3 py-3"><span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] font-semibold">{STATUS_LABEL[r.status]||r.status}</span>{r.failure_reason&&<div className="mt-1 max-w-44 text-[10px] text-destructive">{r.failure_reason}</div>}</td>
          <td className="px-3 py-3 text-right"><div className="flex justify-end gap-1.5">
            {r.status==="pending"&&<><button disabled={busy===r.id} onClick={()=>void act(r.id,()=>approveFn({data:{id:r.id}}),"Pedido aprovado.")} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">Aprovar</button><button onClick={()=>requestReason(r.id,"reject")} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Rejeitar</button><button onClick={()=>requestReason(r.id,"review")} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Review</button></>}
            {r.status==="approved"&&<button disabled={busy===r.id} onClick={()=>void processOne(r.id)} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">Processar</button>}
            {r.status==="processing"&&<button disabled={busy===r.id} onClick={()=>void act(r.id,()=>processFn({data:{id:r.id,mode:"query"}}),"Consulta enviada ao provedor.")} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Consultar</button>}
            {r.status==="failed"&&<button disabled={busy===r.id} onClick={()=>void act(r.id,()=>retryFn({data:{id:r.id}}),"Retry preparado; pedido voltou para APPROVED.")} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Retry</button>}\n            {(r.status==="pending"||r.status==="approved"||r.status==="review")&&<button onClick={()=>requestReason(r.id,"cancel")} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Cancelar</button>}\n            {r.status==="paid"&&<button onClick={()=>{setReverseId(r.id);setReverseTx(r.transaction_id||"");setReason("")}} className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive">Reverter</button>}
          </div></td>
        </tr>)}</tbody>
      </table></div>}

      {selectedRows.length>0&&<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-4 py-3">
        <div className="text-xs"><strong>{selectedRows.length}</strong> elegível(eis) · total <strong>{totalSelected.toLocaleString("pt-PT")} {selectedRows[0]?.currency}</strong><span className="ml-2 text-muted-foreground">Cada payout será processado separadamente.</span></div>
        <button disabled={busy==="batch"} onClick={()=>void processBatch()} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">{busy==="batch"?"A processar…":"Processar lote"}</button>
      </div>}
    </section>

    <section className="grid gap-3 md:grid-cols-3">
      <button onClick={()=>setShowRules(v=>!v)} className="rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/30"><WalletCards className="h-5 w-5 text-muted-foreground"/><p className="mt-2 font-semibold">Limites e regras</p><p className="text-xs text-muted-foreground">Mínimo, máximo, períodos, pedidos e taxas.</p></button>
      <button onClick={()=>setShowRecon(v=>!v)} className="rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/30"><ShieldAlert className="h-5 w-5 text-muted-foreground"/><p className="mt-2 font-semibold">Reconciliação</p><p className="text-xs text-muted-foreground">Ledger vs saques vs payouts.</p></button>
      <div className="rounded-xl border border-border bg-card p-4"><Clock3 className="h-5 w-5 text-muted-foreground"/><p className="mt-2 font-semibold">Histórico</p><p className="text-xs text-muted-foreground">Use os filtros acima para estado, período, método, moeda ou referência.</p></div>
    </section>

    {showRules&&<RulesSection rules={rules} saveRuleFn={saveRuleFn} onSaved={load}/>}
    {showRecon&&<section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Reconciliação financeira</h2><p className="text-xs text-muted-foreground">Nenhuma diferença é corrigida silenciosamente.</p></div><button onClick={()=>void load()} className="text-xs font-semibold">Actualizar</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Moeda</th><th>Ledger reservado</th><th>Saques reservados</th><th>Provider PAID</th><th>Saques PAID</th><th>Divergência</th><th>Estado</th></tr></thead><tbody>{recon.map(r=><tr key={r.currency} className="border-b last:border-0"><td className="py-2 font-semibold">{r.currency}</td><td>{r.reserved_ledger}</td><td>{r.withdrawal_reserved}</td><td>{r.provider_paid}</td><td>{r.withdrawal_paid}</td><td>{r.divergence}</td><td>{r.status==="RECONCILIADO"?<span className="text-emerald-600">✓ RECONCILIADO</span>:<span className="text-destructive">⚠ DIVERGÊNCIA FINANCEIRA</span>}</td></tr>)}</tbody></table>{recon.length===0&&<p className="py-6 text-center text-sm text-muted-foreground">Sem movimentos de saque para reconciliar.</p>}</div></section>}

    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"><h2 className="font-semibold">Reverter payout confirmado</h2><p className="mt-1 text-xs text-muted-foreground">Use somente quando o provedor tiver confirmado a reversão.</p><input value={reverseTx} onChange={e=>setReverseTx(e.target.value)} className="mt-4 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none" placeholder="transaction_id do provedor"/><textarea value={reason} onChange={e=>setReason(e.target.value)} className="mt-3 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none" placeholder="Motivo obrigatório…"/><div className="mt-4 flex justify-end gap-2"><button onClick={()=>setReverseId(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancelar</button><button disabled={reverseTx.trim().length<2||reason.trim().length<3} onClick={()=>void confirmReverse()} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Confirmar reversão</button></div></div></div>{reasonMode&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"><h2 className="font-semibold">{reasonMode==="reject"?"Rejeitar saque":reasonMode==="cancel"?"Cancelar saque":"Enviar para revisão"}</h2><p className="mt-1 text-xs text-muted-foreground">O motivo ficará registado na auditoria.</p><textarea value={reason} onChange={e=>setReason(e.target.value)} className="mt-4 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none" placeholder="Motivo obrigatório…"/><div className="mt-4 flex justify-end gap-2"><button onClick={()=>{setReasonMode(null);setReasonId(null)}} className="rounded-lg border border-border px-3 py-2 text-sm">Cancelar</button><button disabled={reason.trim().length<3} onClick={()=>void confirmReason()} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Confirmar</button></div></div></div>}
  </div>;
}

function RulesSection({rules,saveRuleFn,onSaved}:{rules:Rule[];saveRuleFn:any;onSaved:()=>Promise<void>}) {
  const [rule,setRule]=useState<Rule|null>(rules[0]??null);
  useEffect(()=>setRule(rules[0]??null),[rules]);
  if(!rule)return <section className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Nenhuma regra configurada.</p></section>;
  const save=async()=>{
    await saveRuleFn({data:{id:rule.id,country:rule.country,method:rule.method,currency:rule.currency,enabled:rule.enabled,min:Number(rule.min_amount),max:Number(rule.max_amount),daily:rule.daily_limit==null?null:Number(rule.daily_limit),weekly:rule.weekly_limit==null?null:Number(rule.weekly_limit),monthly:rule.monthly_limit==null?null:Number(rule.monthly_limit),maxRequests:Number(rule.max_requests_per_day),fee:Number(rule.fee)}});
    await onSaved();
  };
  return <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Limites e regras</h2><p className="text-xs text-muted-foreground">As regras são aplicadas no backend no momento do pedido.</p></div><button onClick={()=>void save()} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Guardar</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Mínimo","min_amount"],["Máximo","max_amount"],["Limite diário","daily_limit"],["Limite semanal","weekly_limit"],["Limite mensal","monthly_limit"],["Pedidos/dia","max_requests_per_day"],["Taxa","fee"]].map(([label,key])=><label key={key} className="text-xs font-medium"><span>{label}</span><input type="number" value={String((rule as any)[key]??"")} onChange={e=>setRule({...rule,[key]:e.target.value===""?null:Number(e.target.value)})} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"/></label>)}</div><label className="mt-4 flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={rule.enabled} onChange={e=>setRule({...rule,enabled:e.target.checked})}/> Método activo</label></section>;
}
