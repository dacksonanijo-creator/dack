import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, content-type, apikey"};
const url=Deno.env.get("SUPABASE_URL")!; const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(url,service);
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 const auth=req.headers.get("Authorization")??""; if(!auth.startsWith("Bearer ")) return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
 const token=auth.slice(7); const client=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:{user}}=await client.auth.getUser(); if(!user)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
 const {data:isAdmin}=await client.rpc("is_taskora_admin"); const body=await req.json().catch(()=>({})); const target=typeof body.user_id==="string"?body.user_id:user.id;
 if(target!==user.id&&!isAdmin)return new Response(JSON.stringify({error:"forbidden"}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
 const {data:rows,error}=await admin.from("notification_deliveries").select("id,notification_id,user_id,channel,status,attempts").eq("user_id",target).eq("status","pending").in("channel",["push","email"]).order("created_at").limit(25);
 if(error)return new Response(JSON.stringify({error:error.message}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
 const vp=Deno.env.get("VAPID_PUBLIC_KEY"), vk=Deno.env.get("VAPID_PRIVATE_KEY"), vs=Deno.env.get("VAPID_SUBJECT")??"mailto:admin@taskora.app"; if(vp&&vk)webpush.setVapidDetails(vs,vp,vk);
 const rk=Deno.env.get("RESEND_API_KEY"), from=Deno.env.get("NOTIFICATION_FROM_EMAIL"); let processed=0;
 for(const row of rows??[]){
  const {data:n}=await admin.from("notifications").select("title,message,priority,metadata").eq("id",row.notification_id).maybeSingle(); if(!n)continue;
  let ok=false,ref=null as string|null,errMsg=null as string|null;
  if(row.channel==="push"){
   if(!vp||!vk)errMsg="Push não configurado"; else {
    const {data:devices}=await admin.from("notification_devices").select("id,subscription").eq("user_id",target).eq("active",true);
    if(!devices?.length)errMsg="Nenhum dispositivo activo"; else for(const d of devices){try{const r=await webpush.sendNotification(d.subscription,JSON.stringify({title:n.title,body:n.message,route:n.metadata?.route??null,priority:n.priority}));if(r.statusCode>=200&&r.statusCode<300)ok=true}catch(e){const sc=(e as {statusCode?:number}).statusCode;if(sc===404||sc===410)await admin.from("notification_devices").update({active:false,invalidated_at:new Date().toISOString()}).eq("id",d.id);errMsg="Dispositivo inválido ou push indisponível";}}
   }
  } else {
   if(!rk||!from)errMsg="Email não configurado"; else {const {data:p}=await admin.from("profiles").select("email").eq("id",target).maybeSingle();if(!p?.email)errMsg="Conta sem email";else{const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${rk}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[p.email],subject:n.title,text:n.message})});ok=r.ok;const j=await r.json().catch(()=>({}));ref=j.id??null;if(!ok)errMsg="Falha no provedor de email";}}
  }
  await admin.from("notification_deliveries").update({status:ok?"sent":"failed",provider_ref:ref,error_message:errMsg,attempts:row.attempts+1,updated_at:new Date().toISOString()}).eq("id",row.id); processed++;
 }
 return new Response(JSON.stringify({processed}),{headers:{...cors,"Content-Type":"application/json"}});
});