import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    if (!isAdminEmail(data.user.email)) throw redirect({ to: "/app" });
    return { adminUser: data.user };
  },
  component: AdminShell,
});
