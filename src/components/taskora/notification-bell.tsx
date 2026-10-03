import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell({ label }: { label: string }) {
  const [count,setCount]=useState(0);
  useEffect(()=>{
    let active=true;
    const load=async()=>{const {count}=await (supabase as any).from("notifications").select("id",{count:"exact",head:true}).is("read_at",null);if(active)setCount(count??0);};
    void load();
    const channel=supabase.channel("taskora-notifications").on("postgres_changes",{event:"*",schema:"public",table:"notifications"},()=>{void load()}).subscribe();
    return()=>{active=false;void supabase.removeChannel(channel);};
  },[]);
  return <Link to="/app/notifications" aria-label={label} className="relative grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
    <Bell className="h-[18px] w-[18px]" />
    {count>0&&<span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] font-bold leading-4 text-primary-foreground">{count>99?"99+":count}</span>}
  </Link>;
}
