import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const publishableKey = publishableKeysRaw ? JSON.parse(publishableKeysRaw).default : Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  if (!url || !publishableKey) return false;
  const client = createClient(url, publishableKey, { global: { headers: { Authorization: auth } } });
  const { data } = await client.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase() ?? "";
  return Boolean(email && (new Set(["dackson144@gmail.com","dacksonanijo@gmail.com"]).has(email) || data.user?.app_metadata?.role === "admin"));
}

function db() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return url && key ? createClient(url, key) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ message: "Método não suportado." }, 405);
  if (!(await requireAdmin(req))) return json({ message: "Acesso administrativo não autorizado." }, 403);

  const client = db();
  if (!client) return json({ message: "Backend database indisponível." }, 500);

  try {
    const [catalog, registered] = await Promise.all([
      client.from("task_provider_integrations")
        .select("provider_key, display_name, integration_type, environment, config_route")
        .order("display_name"),
      client.from("task_provider_registry")
        .select("provider_key, display_name, integration_type, environment, status, enabled, credentials_configured, last_test_at, registered_at")
        .order("display_name"),
    ]);

    if (catalog.error || registered.error) throw new Error("Não foi possível carregar os fornecedores.");

    return json({
      catalog: catalog.data ?? [],
      providers: registered.data ?? [],
    });
  } catch {
    return json({ message: "Não foi possível carregar os fornecedores integrados." }, 500);
  }
});
