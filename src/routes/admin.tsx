import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";
// Security tables/functions are not yet in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { isAdminEmail } from "@/lib/admin";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    if (!isAdminEmail(data.user.email)) throw redirect({ to: "/app" });

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = (factors?.all ?? []).some((factor) => factor.factor_type === "totp" && factor.status === "verified");
    if (verifiedTotp) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") throw redirect({ to: "/admin/2fa" });
    }

    const sessionKey = sessionStorage.getItem("taskora-admin-session-key") ?? crypto.randomUUID();
    sessionStorage.setItem("taskora-admin-session-key", sessionKey);
    await db.rpc("touch_security_session", {
      p_session_key: sessionKey,
      p_device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Dispositivo móvel" : "Computador",
      p_browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/?[\d.]*/i)?.[0] ?? "Navegador",
      p_user_agent: navigator.userAgent,
    });

    return { adminUser: data.user };
  },
  component: AdminShell,
});
