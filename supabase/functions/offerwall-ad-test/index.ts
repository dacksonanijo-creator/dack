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

async function saveApiKey(apiKey: string) {
  const db = adminDatabaseClient();
  if (!db) throw new Error("Backend database client unavailable");

  const { error } = await db.rpc("save_offerwall_ad_api_key", { p_api_key: apiKey });
  if (error) throw new Error("Não foi possível guardar a credencial com segurança.");
}

async function getStoredApiKey(): Promise<string> {
  const db = adminDatabaseClient();
  if (!db) return "";

  const { data, error } = await db.rpc("get_offerwall_ad_api_key");
  if (error) return "";
  return typeof data === "string" ? data.trim() : "";
}

async function saveMetadata(endpoint: string, status: string, testedAt: string | null, enabledOverride?: boolean, communicationAt: string | null = testedAt) {
  const db = adminDatabaseClient();
  if (!db) return;

  let enabled = enabledOverride;
  if (enabled === undefined) {
    const { data: current } = await db.from("offerwall_ad_provider_config")
      .select("enabled")
      .eq("provider", "offerwall_ad")
      .maybeSingle();
    enabled = Boolean(current?.enabled);
  }

  const payload = {
    provider: "offerwall_ad",
    environment: "production", endpoint: endpoint || null,
    enabled,
    last_test_at: testedAt,
    last_communication_at: communicationAt,
    last_test_status: status,
    updated_at: new Date().toISOString(),
  };

  await db.from("offerwall_ad_provider_config").upsert(payload, { onConflict: "provider" });

  const { data: integration } = await db
    .from("task_provider_integrations")
    .select("display_name, integration_type, environment")
    .eq("provider_key", "offerwall_ad")
    .maybeSingle();

  if (integration) {
    await db.from("task_provider_registry").upsert({
      provider_key: "offerwall_ad",
      display_name: integration.display_name,
      integration_type: integration.integration_type,
      environment: integration.environment,
      status: status === "connected" ? "connected" : status === "attention" ? "attention" : status === "disabled" ? "disabled" : status === "not_configured" ? "not_configured" : "error",
      enabled,
      credentials_configured: true,
      last_test_at: testedAt,
      registered_at: enabled ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider_key" });
  }
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

    const transientApiKey =
      typeof body?.apiKey === "string" && body.apiKey.trim()
        ? body.apiKey.trim()
        : "";

    const action = body?.action === "save_configuration"
      ? "save_configuration"
      : body?.action === "get_configuration"
        ? "get_configuration"
        : body?.action === "set_enabled"
        ? "set_enabled"
        : "test_connection";

    if (action === "get_configuration") {
      const db = adminDatabaseClient();
      if (!db) return json({ status: "communication_error", message: "Backend database indisponível." }, 500);
      const { data } = await db.from("offerwall_ad_provider_config")
        .select("endpoint, enabled, last_test_at, last_communication_at, last_test_status")
        .eq("provider", "offerwall_ad")
        .maybeSingle();
      const storedKey = await getStoredApiKey();
      return json({
        status: data?.last_test_status ?? "not_configured",
        endpoint: data?.endpoint ?? configuredEndpoint(),
        enabled: Boolean(data?.enabled),
        testedAt: data?.last_test_at ?? null,
        lastCommunicationAt: data?.last_communication_at ?? null,
        apiKeyConfigured: Boolean(storedKey || configuredKey()),
      });
    }

    if (action === "set_enabled") {
      const db = adminDatabaseClient();
      if (!db) return json({ status: "communication_error", message: "Backend database indisponível." }, 500);
      const enabled = body?.enabled === true;
      const { data } = await db.from("offerwall_ad_provider_config")
        .select("last_test_status")
        .eq("provider", "offerwall_ad")
        .maybeSingle();
      if (enabled && data?.last_test_status !== "connected") {
        return json({ status: "not_configured", message: "Teste a conexão com sucesso antes de ativar o fornecedor." });
      }
      const now = new Date().toISOString();
      await db.from("offerwall_ad_provider_config")
        .upsert({ provider: "offerwall_ad", enabled, last_test_status: data?.last_test_status ?? "not_configured", updated_at: now }, { onConflict: "provider" });
      const { data: integration } = await db.from("task_provider_integrations")
        .select("display_name, integration_type, environment")
        .eq("provider_key", "offerwall_ad")
        .maybeSingle();
      if (integration) {
        await db.from("task_provider_registry").upsert({
          provider_key: "offerwall_ad",
          display_name: integration.display_name,
          integration_type: integration.integration_type,
          environment: integration.environment,
          status: enabled ? "connected" : "disabled",
          enabled,
          credentials_configured: true,
          last_test_at: data?.last_test_status === "connected" ? (await db.from("offerwall_ad_provider_config").select("last_test_at").eq("provider", "offerwall_ad").maybeSingle()).data?.last_test_at ?? null : null,
          last_communication_at: (await db.from("offerwall_ad_provider_config").select("last_communication_at").eq("provider", "offerwall_ad").maybeSingle()).data?.last_communication_at ?? null,
          registered_at: enabled ? now : null,
          updated_at: now,
        }, { onConflict: "provider_key" });
      }
      return json({
        status: enabled ? "connected" : "disabled",
        enabled,
        message: enabled ? "Offerwall Ad ativado." : "Offerwall Ad desativado.",
      });
    }

    // A manually entered key is used only during this HTTPS request.
    // Persistent storage is handled exclusively by the backend through Supabase Vault.
    const apiKey = transientApiKey || await getStoredApiKey() || configuredKey();

    if (action === "save_configuration") {
      if (!endpoint) {
        return json({ status: "not_configured", message: "Informe o endpoint oficial do Offerwall Ad." });
      }
      if (!transientApiKey && !(await getStoredApiKey()) && !configuredKey()) {
        return json({ status: "not_configured", message: "Informe a API Key do Offerwall Ad para guardar a configuração." });
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

      if (transientApiKey) await saveApiKey(transientApiKey);
      await saveMetadata(parsed.toString(), "not_configured", null);
      return json({
        status: "not_configured",
        message: "Configuração guardada com segurança. A API Key foi armazenada no backend e não será exibida novamente.",
        apiKeyConfigured: true,
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
        await saveMetadata(endpoint, "endpoint_error", new Date().toISOString(), undefined, null);
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
