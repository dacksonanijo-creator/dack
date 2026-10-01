import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const configuredKey = () => Deno.env.get("OFFERWALL_AD_API_KEY")?.trim() ?? "";
const configuredEndpoint = () => Deno.env.get("OFFERWALL_AD_API_ENDPOINT")?.trim() ?? "";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeError(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value ?? "Erro desconhecido");
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/nxc_[A-Za-z0-9._~+/=-]+/gi, "nxc_[REDACTED]")
    .slice(0, 500);
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const publishableKey = publishableKeysRaw
    ? JSON.parse(publishableKeysRaw).default
    : Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  if (!url || !publishableKey) return false;

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase() ?? "";
  if (!email) return false;

  const allowed = new Set([
    "dackson144@gmail.com",
    "dacksonanijo@gmail.com",
  ]);
  return allowed.has(email) || data.user?.app_metadata?.role === "admin";
}

function adminDatabaseClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

async function saveMetadata(endpoint: string, status: string, testedAt: string | null) {
  const db = adminDatabaseClient();
  if (!db) return;

  await db.from("offerwall_ad_provider_config").upsert(
    {
      provider: "offerwall_ad",
      environment: "production",
      endpoint: endpoint || null,
      enabled: status === "connected",
      last_test_at: testedAt,
      last_test_status: status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ status: "communication_error", message: "Método não suportado." }, 405);
  }

  if (!(await requireAdmin(req))) {
    return json({ status: "communication_error", message: "Acesso administrativo não autorizado." }, 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = typeof body?.endpoint === "string" && body.endpoint.trim()
      ? body.endpoint.trim()
      : configuredEndpoint();

    // The manually entered key is accepted only for this HTTPS request.
    // It is never persisted, logged, returned, or written to GitHub.
    const apiKey =
      typeof body?.apiKey === "string" && body.apiKey.trim()
        ? body.apiKey.trim()
        : configuredKey();

    const action = body?.action === "save_configuration" ? "save_configuration" : "test_connection";

    if (action === "save_configuration") {
      if (!endpoint) {
        return json({ status: "not_configured", message: "Informe o endpoint oficial do Offerwall Ad." });
      }

      let parsed: URL;
      try {
        parsed = new URL(endpoint);
        if (parsed.protocol !== "https:") {
          return json({ status: "endpoint_error", message: "O endpoint da API deve usar HTTPS." });
        }
      } catch {
        return json({ status: "endpoint_error", message: "Endpoint da API inválido." });
      }

      await saveMetadata(parsed.toString(), "not_configured", null);
      return json({
        status: "not_configured",
        message: "Configuração guardada. A API Key não foi armazenada; ela deve ser fornecida para o teste ou configurada como secret no backend.",
      });
    }

    if (!endpoint || !apiKey) {
      return json({
        status: "not_configured",
        message: "Informe a API Key e o endpoint oficial do Offerwall Ad.",
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(endpoint);
      if (parsed.protocol !== "https:") {
        await saveMetadata(endpoint, "endpoint_error", new Date().toISOString());
        return json({ status: "endpoint_error", message: "O endpoint da API deve usar HTTPS." });
      }
    } catch {
      await saveMetadata(endpoint, "endpoint_error", new Date().toISOString());
      return json({ status: "endpoint_error", message: "Endpoint da API inválido." });
    }

    const testedAt = new Date().toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(parsed.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        await saveMetadata(parsed.toString(), "authentication_error", testedAt);
        return json({ status: "authentication_error", message: "A API Key foi rejeitada pelo Offerwall Ad.", testedAt });
      }

      if (!response.ok) {
        await saveMetadata(parsed.toString(), "communication_error", testedAt);
        return json({
          status: "communication_error",
          message: `O Offerwall Ad respondeu com HTTP ${response.status}.`,
          testedAt,
        });
      }

      await saveMetadata(parsed.toString(), "connected", testedAt);
      return json({
        status: "connected",
        message: "Conexão com o Offerwall Ad estabelecida.",
        testedAt,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[offerwall-ad] connection test failed:", sanitizeError(error));
    return json({ status: "communication_error", message: "Não foi possível comunicar com o Offerwall Ad." });
  }
});
