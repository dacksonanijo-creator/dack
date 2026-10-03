import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminDatabaseClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceRoleKey) throw new Error("Backend indisponível");
  return createClient(url, serviceRoleKey);
}

async function getWebhookSecret() {
  const db = adminDatabaseClient();
  const { data, error } = await db.rpc("get_debito_pay_secret", {
    p_name: "taskora_debito_pay_webhook_secret",
  });
  if (error || typeof data !== "string" || !data.trim()) return "";
  return data.trim();
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature")?.trim() ?? "";
  const secret = await getWebhookSecret();

  if (!secret || !signature) {
    return json({ ok: false, error: "signature_required" }, 401);
  }

  const expected = await hmacSha256Hex(secret, rawBody);
  if (!timingSafeEqual(
    new TextEncoder().encode(expected.toLowerCase()),
    new TextEncoder().encode(signature.toLowerCase()),
  )) {
    return json({ ok: false, error: "invalid_signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const data = payload?.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : {};

  const event = typeof payload?.event === "string" ? payload.event : null;
  const paymentId = typeof data.payment_id === "string" ? data.payment_id : null;
  const reference = typeof data.reference === "string" ? data.reference : null;
  const status = typeof data.status === "string" ? data.status : event;
  const amount = typeof data.amount === "number" ? data.amount : null;
  const currency = typeof data.currency === "string" ? data.currency : null;
  const timestamp = typeof payload?.timestamp === "string"
    ? payload.timestamp
    : typeof data.paid_at === "string"
      ? data.paid_at
      : null;

  // Debito Pay documents payment_id as the idempotency handle for webhook events.
  // If it is absent, hash the exact signed payload so the same delivery cannot be
  // inserted twice.
  const idempotencyKey = paymentId || await sha256Hex(rawBody);

  const db = adminDatabaseClient();
  const { data: inserted, error } = await db.from("debito_pay_webhook_events").insert({
    idempotency_key: idempotencyKey,
    event,
    transaction_reference: reference,
    payment_id: paymentId,
    status,
    amount,
    currency,
    event_at: timestamp,
    response: payload,
    received_at: new Date().toISOString(),
  }).select("id").maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return json({ ok: true, duplicate: true });
    }
    return json({ ok: false, error: "storage_error" }, 500);
  }

  await db.from("debito_pay_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", inserted?.id);

  await db.from("debito_pay_provider_config")
    .update({ last_communication_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("provider", "debito_pay");

  return json({ ok: true, duplicate: false });
});
