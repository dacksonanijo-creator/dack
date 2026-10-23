import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { ClientShell } from "@/components/taskora/client-shell";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";

const db = supabase as any;

export type ClientProfile = {
  account_type: string;
  full_name: string | null;
  business_name: string | null;
  verification_status: string | null;
  email: string | null;
};

export const Route = createFileRoute("/client")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    if (isAdminEmail(data.user.email)) throw redirect({ to: "/admin" });
    const { data: profile, error: profileError } = await db.from("profiles")
      .select("account_type,full_name,business_name,verification_status,email")
      .eq("id", data.user.id).maybeSingle();
    if (profileError || profile?.account_type !== "client") throw redirect({ to: "/app" });
    return { userId: data.user.id, profile: profile as ClientProfile, authEmail: data.user.email ?? null };
  },
  component: ClientLayout,
});

function ClientLayout() {
  return <ClientShell />;
}
