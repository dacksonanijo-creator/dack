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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ status: "communication_error", message: "Método não suportado." }, 405);

  if (!(await requireAdmin(req))) {
    return json({ status: "communication_error", message: "Acesso administrativo não autorizado." }, 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = typeof body?.endpoint === "string" && body.endpoint.trim()
      ? body.endpoint.trim()
      : configuredEndpoint();
    const apiKey = typeof body?.apiKey === "string" && body.apiKey.trim()
      ? body.apiKey.trim()
      : configuredKey();

    if (!endpoint || !apiKey) {
      return json({ status: "not_configured", message: "Offerwall Ad não está configurado no backend." });
    }

    let parsed: URL;
    try {
      parsed = new URL(endpoint);
      if (parsed.protocol !== "https:") {
        return json({ status: "communication_error", message: "O endpoint da API deve usar HTTPS." });
      }
    } catch {
      return json({ status: "communication_error", message: "Endpoint da API inválido." });
    }

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
        return json({ status: "authentication_error", message: "A API Key foi rejeitada pelo Offerwall Ad." });
      }

      if (!response.ok) {
        return json({
          status: "communication_error",
          message: `O Offerwall Ad respondeu com HTTP ${response.status}.`,
        });
      }

      return json({ status: "connected", message: "Conexão com o Offerwall Ad estabelecida." });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[offerwall-ad] connection test failed:", sanitizeError(error));
    return json({ status: "communication_error", message: "Não foi possível comunicar com o Offerwall Ad." });
  }
});
