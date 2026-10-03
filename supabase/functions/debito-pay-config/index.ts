import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAILS = new Set([
  "dackson144@gmail.com",
  "dacksonanijo@gmail.com",
]);

type ProviderStatus =
  | "not_configured"
  | "connected"
  | "authentication_error"
  | "communication_error"
  | "disabled";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminDatabaseClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    (() => {
      try {
        return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default ?? "";
      } catch {
        return "";
      }
    })();

  if (!url || !publishableKey) return false;

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase() ?? "";

  return ADMIN_EMAILS.has(email) || data.user?.app_metadata?.role === "admin";
}

async function getSecret(name: string) {
  const db = adminDatabaseClient();
  if (!db) return "";
  const { data, error } = await db.rpc("get_debito_pay_secret", { p_name: name });
  if (error || typeof data !== "string") return "";
  return data.trim();
}

async function saveSecret(name: string, value: string) {
  const db = adminDatabaseClient();
  if (!db) throw new Error("Backend indisponível");
  const { error } = await db.rpc("save_debito_pay_secret", {
    p_name: name,
    p_secret: value,
  });
  if (error) throw new Error("Não foi possível guardar a credencial com segurança.");
}

function sanitizeError(value: unknown) {
  return (value instanceof Error ? value.message : String(value ?? "Erro desconhecido"))
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(api[_-]?key|webhook[_-]?secret|secret)[=:]\s*[^\s,}]+/gi, "$1=[REDACTED]")
    .slice(0, 400);
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

async function getConfig() {
  const db = adminDatabaseClient();
  if (!db) throw new Error("Backend indisponível");

  const { data, error } = await db
    .from("debito_pay_provider_config")
    .select("environment, merchant_id, wallet_code, base_url, webhook_url, enabled, status, last_test_at, last_communication_at")
    .eq("provider", "debito_pay")
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar a configuração.");
  const apiKey = await getSecret("taskora_debito_pay_api_key");
  const webhookSecret = await getSecret("taskora_debito_pay_webhook_secret");

  return {
    status: data?.enabled ? data.status : (data ? "disabled" : "not_configured"),
    environment: data?.environment ?? "sandbox",
    merchantId: data?.merchant_id ?? "",
    walletCode: data?.wallet_code ?? "",
    baseUrl: data?.base_url ?? "",
    webhookUrl: data?.webhook_url ?? "",
    enabled: Boolean(data?.enabled),
    lastTestAt: data?.last_test_at ?? null,
    lastCommunicationAt: data?.last_communication_at ?? null,
    apiKeyConfigured: Boolean(apiKey),
    webhookSecretConfigured: Boolean(webhookSecret),
  };
}

async function saveMetadata(input: {
  environment: string;
  merchantId: string;
  walletCode: string;
  baseUrl: string;
  enabled?: boolean;
  status?: ProviderStatus;
  lastTestAt?: string | null;
  lastCommunicationAt?: string | null;
}) {
  const db = adminDatabaseClient();
  if (!db) throw new Error("Backend indisponível");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const webhookUrl = supabaseUrl
    ? supabaseUrl.replace(/\/+$/, "") + "/functions/v1/debito-pay-webhook"
    : "";

  const { error } = await db.from("debito_pay_provider_config").upsert(
    {
      provider: "debito_pay",
      environment: input.environment,
      merchant_id: input.merchantId || null,
      wallet_code: input.walletCode || null,
      base_url: input.baseUrl || null,
      webhook_url: webhookUrl || null,
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.lastTestAt !== undefined ? { last_test_at: input.lastTestAt } : {}),
      ...(input.lastCommunicationAt !== undefined ? { last_communication_at: input.lastCommunicationAt } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );

  if (error) throw new Error("Não foi possível guardar a configuração.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ status: "communication_error", message: "Método não suportado." }, 405);

  if (!(await requireAdmin(req))) {
    return json({ status: "communication_error", message: "Acesso administrativo não autorizado." }, 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = ["get_configuration", "save_configuration", "test_connection", "set_enabled"].includes(body?.action)
      ? body.action
      : "get_configuration";

    if (action === "get_configuration") {
      return json(await getConfig());
    }

    const existing = await getConfig();
    const environment = body?.environment === "production" ? "production" : "sandbox";
    const merchantId = typeof body?.merchantId === "string" ? body.merchantId.trim() : existing.merchantId;
    const walletCode = typeof body?.walletCode === "string" ? body.walletCode.trim() : existing.walletCode;
    const baseUrl = normalizeBaseUrl(
      typeof body?.baseUrl === "string" && body.baseUrl.trim()
        ? body.baseUrl
        : existing.baseUrl,
    );
    const apiKeyInput = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
    const webhookSecretInput = typeof body?.webhookSecret === "string" ? body.webhookSecret.trim() : "";

    if (action === "set_enabled") {
      const enabled = Boolean(body?.enabled);

      if (enabled) {
        if (!existing.apiKeyConfigured || !existing.webhookSecretConfigured) {
          return json({
            status: "not_configured",
            message: "Configure a API Key e o Webhook Secret antes de ativar o Debito Pay.",
          });
        }
        if (existing.status !== "connected") {
          return json({
            status: existing.status,
            message: "Teste a conexão com sucesso antes de ativar o Debito Pay.",
          });
        }
      }

      await saveMetadata({
        environment,
        merchantId,
        walletCode,
        baseUrl,
        enabled,
        status: enabled ? existing.status : "disabled",
        lastCommunicationAt: new Date().toISOString(),
      });
      return json(await getConfig());
    }

    if (!merchantId) {
      return json({ status: "not_configured", message: "Informe o Merchant ID do Debito Pay." });
    }

    if (!walletCode) {
      return json({ status: "not_configured", message: "Informe o Wallet Code do Debito Pay." });
    }

    if (!baseUrl) {
      return json({ status: "not_configured", message: "Informe a Base URL/Endpoint documentada pelo Debito Pay para este ambiente." });
    }

    if (!/^https:\/\//i.test(baseUrl)) {
      return json({ status: "communication_error", message: "A Base URL deve usar HTTPS." });
    }

    if (action === "save_configuration") {
      if (apiKeyInput) await saveSecret("taskora_debito_pay_api_key", apiKeyInput);
      if (webhookSecretInput) await saveSecret("taskora_debito_pay_webhook_secret", webhookSecretInput);

      if (!apiKeyInput && !existing.apiKeyConfigured) {
        return json({ status: "not_configured", message: "Informe a API Key do Debito Pay." });
      }

      await saveMetadata({
        environment,
        merchantId,
        walletCode,
        baseUrl,
        enabled: existing.enabled,
        status: existing.enabled ? existing.status : "disabled",
        lastCommunicationAt: new Date().toISOString(),
      });

      return json({
        ...(await getConfig()),
        message: "Configuração guardada. As credenciais permanecem apenas no backend.",
      });
    }

    if (action === "test_connection") {
      const apiKey = apiKeyInput || await getSecret("taskora_debito_pay_api_key");
      if (!apiKey) {
        return json({ status: "not_configured", message: "Configure a API Key antes de testar a conexão." });
      }

      const url = new URL(baseUrl + "/wallet-balance");
      if (walletCode) url.searchParams.set("wallet_code", walletCode);

      const testedAt = new Date().toISOString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (response.status === 401) {
          await saveMetadata({
            environment,
            merchantId,
            walletCode,
            baseUrl,
            status: "authentication_error",
            lastTestAt: testedAt,
            lastCommunicationAt: testedAt,
          });
          return json({ status: "authentication_error", message: "O Debito Pay rejeitou a API Key.", testedAt });
        }

        if (!response.ok) {
          await saveMetadata({
            environment,
            merchantId,
            walletCode,
            baseUrl,
            status: "communication_error",
            lastTestAt: testedAt,
            lastCommunicationAt: testedAt,
          });
          return json({
            status: "communication_error",
            message: `O endpoint Debito Pay respondeu com HTTP ${response.status}.`,
            testedAt,
          });
        }

        await saveMetadata({
          environment,
          merchantId,
          walletCode,
          baseUrl,
          status: "connected",
          lastTestAt: testedAt,
          lastCommunicationAt: testedAt,
        });

        return json({
          status: "connected",
          message: "Conexão com o Debito Pay estabelecida.",
          testedAt,
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    return json({ status: "communication_error", message: "Ação não suportada." }, 400);
  } catch (error) {
    console.error("[debito-pay] operation failed:", sanitizeError(error));
    return json({ status: "communication_error", message: "Não foi possível comunicar com o backend do Debito Pay." }, 500);
  }
});
