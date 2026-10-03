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

function sanitizeError(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value ?? "Erro desconhecido");
  return message
    .replace(/((?:apiKey|api_key|key)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
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

  const { error } = await db.rpc("save_ayet_studios_api_key", { p_api_key: apiKey });
  if (error) throw new Error("Não foi possível guardar a credencial com segurança.");
}

async function getStoredApiKey(): Promise<string> {
  const db = adminDatabaseClient();
  if (!db) return "";

  const { data, error } = await db.rpc("get_ayet_studios_api_key");
  if (error) return "";
  return typeof data === "string" ? data.trim() : "";
}

async function saveMetadata(adslotId: string, status: string, testedAt: string | null) {
  const db = adminDatabaseClient();
  if (!db) return;

  await db.from("ayet_studios_provider_config").upsert(
    {
      provider: "ayet_studios",
      integration_type: "offerwall_surveywall",
      environment: "production",
      adslot_id: adslotId || null,
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
    const adslotId = typeof body?.adslotId === "string" ? body.adslotId.trim() : "";
    const transientApiKey =
      typeof body?.apiKey === "string" && body.apiKey.trim()
        ? body.apiKey.trim()
        : "";

    const action =
      body?.action === "save_configuration"
        ? "save_configuration"
        : body?.action === "get_configuration"
          ? "get_configuration"
          : "test_connection";

    if (action === "get_configuration") {
      const db = adminDatabaseClient();
      if (!db) {
        return json({ status: "communication_error", message: "Backend database indisponível." }, 500);
      }

      const { data } = await db
        .from("ayet_studios_provider_config")
        .select("adslot_id, enabled, last_test_at, last_test_status")
        .eq("provider", "ayet_studios")
        .maybeSingle();

      const storedKey = await getStoredApiKey();

      return json({
        status: data?.last_test_status ?? "not_configured",
        adslotId: data?.adslot_id ?? "",
        environment: "production",
        enabled: Boolean(data?.enabled),
        testedAt: data?.last_test_at ?? null,
        apiKeyConfigured: Boolean(storedKey),
      });
    }

    const storedApiKey = await getStoredApiKey();
    const apiKey = transientApiKey || storedApiKey;

    if (action === "save_configuration") {
      if (!adslotId) {
        return json({ status: "not_configured", message: "Informe o Adslot ID do ayeT-Studios." });
      }
      if (!/^\d+$/.test(adslotId)) {
        return json({ status: "endpoint_error", message: "O Adslot ID deve ser numérico, conforme a documentação oficial." });
      }
      if (!transientApiKey && !storedApiKey) {
        return json({ status: "not_configured", message: "Informe a API Key do ayeT-Studios para guardar a configuração." });
      }

      if (transientApiKey) await saveApiKey(transientApiKey);
      await saveMetadata(adslotId, "not_configured", null);

      return json({
        status: "not_configured",
        message: "Configuração guardada com segurança. A API Key foi armazenada no backend e não será exibida novamente.",
        apiKeyConfigured: true,
      });
    }

    if (!adslotId) {
      return json({
        status: "not_configured",
        message: "Informe o Adslot ID do ayeT-Studios.",
      });
    }

    if (!apiKey) {
      return json({
        status: "not_configured",
        message: "Informe a API Key do ayeT-Studios para guardar a configuração antes de testar.",
      });
    }

    if (!/^\d+$/.test(adslotId)) {
      return json({
        status: "endpoint_error",
        message: "O Adslot ID deve ser numérico, conforme a documentação oficial.",
      });
    }

    // The current official Offerwall API documentation does not define the
    // publisher API key as a request parameter for this endpoint. The key is
    // therefore stored securely for the integration, while this connection
    // test validates the configured adslot against the documented Offerwall
    // endpoint without placing the secret in a URL or frontend request.
    const url = new URL(
      `https://www.ayetstudios.com/offers/offerwall_api/${encodeURIComponent(adslotId)}`,
    );
    url.searchParams.set("external_identifier", "taskora-admin-connection-test");

    const testedAt = new Date().toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "TASKORA/ayet-studios-connection-test",
        },
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        await saveMetadata(adslotId, "authentication_error", testedAt);
        return json({
          status: "authentication_error",
          message: "O ayeT-Studios rejeitou a solicitação para este Adslot ID.",
          testedAt,
        });
      }

      if (response.status === 400 || response.status === 404) {
        await saveMetadata(adslotId, "endpoint_error", testedAt);
        return json({
          status: "endpoint_error",
          message: `O Adslot ID não foi aceito pelo endpoint oficial do ayeT-Studios (HTTP ${response.status}).`,
          testedAt,
        });
      }

      if (response.status === 429) {
        await saveMetadata(adslotId, "communication_error", testedAt);
        return json({
          status: "communication_error",
          message: "O ayeT-Studios limitou temporariamente as solicitações de teste. Tente novamente mais tarde.",
          testedAt,
        });
      }

      if (!response.ok) {
        await saveMetadata(adslotId, "communication_error", testedAt);
        return json({
          status: "communication_error",
          message: `O ayeT-Studios respondeu com HTTP ${response.status}.`,
          testedAt,
        });
      }

      const payload = await response.json().catch(() => null);
      if (!payload || payload.status !== "success") {
        await saveMetadata(adslotId, "endpoint_error", testedAt);
        return json({
          status: "endpoint_error",
          message: "O endpoint respondeu, mas não retornou o formato de sucesso documentado pelo ayeT-Studios.",
          testedAt,
        });
      }

      await saveMetadata(adslotId, "connected", testedAt);
      return json({
        status: "connected",
        message: "Conexão com o endpoint Offerwall do ayeT-Studios estabelecida para o Adslot ID configurado. A API Key permanece somente no backend.",
        testedAt,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[ayet-studios] connection test failed:", sanitizeError(error));
    return json({
      status: "communication_error",
      message: "Não foi possível comunicar com o ayeT-Studios.",
    });
  }
});
