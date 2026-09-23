/**
 * Vodacom M-Pesa Moçambique — Open API (developer.mpesa.vm.co.mz).
 * B2C:   POST https://{host}:18345/ipg/v1x/b2cPayment/
 * Query: GET  https://{host}:18353/ipg/v1x/queryTransactionStatus/
 * Auth:  Bearer = base64(RSA_PKCS1_v1.5(API_KEY, PUBLIC_KEY))
 * Sucesso: output_ResponseCode === "INS-0". B2C é síncrono (sem callback).
 */
import type { PayoutOutcome, PayoutProvider, PayoutRequest, PayoutEnvironment } from "./types.server";

const HOSTS: Record<PayoutEnvironment, string> = {
  sandbox: "api.sandbox.vm.co.mz",
  production: "api.vm.co.mz",
};
// Códigos em que o resultado é incerto → consultar estado
const UNCERTAIN = new Set(["INS-9", "INS-10", "INS-996", "INS-997"]);

function env() {
  return {
    environment: (process.env["MPESA_ENV"] === "production" ? "production" : "sandbox") as PayoutEnvironment,
    apiKey: process.env["MPESA_API_KEY"],
    publicKey: process.env["MPESA_PUBLIC_KEY"],
    serviceProviderCode: process.env["MPESA_SERVICE_PROVIDER_CODE"],
    origin: process.env["MPESA_ORIGIN"] || "developer.mpesa.vm.co.mz",
  };
}

// ---------- RSA PKCS#1 v1.5 (WebCrypto não suporta este padding para cifrar) ----------
function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToBigInt(s: string) {
  const bytes = b64ToBytes(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return BigInt("0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
}
function modPow(base: bigint, exp: bigint, mod: bigint) {
  let r = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) r = (r * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return r;
}
let tokenCache: { key: string; token: string } | null = null;
async function bearerToken(apiKey: string, publicKey: string) {
  const cacheKey = apiKey + publicKey;
  if (tokenCache?.key === cacheKey) return tokenCache.token;
  const der = b64ToBytes(publicKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
  const key = await crypto.subtle.importKey("spki", der, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const n = b64urlToBigInt(jwk.n!);
  const e = b64urlToBigInt(jwk.e!);
  const k = Math.ceil(n.toString(16).length / 2);
  const msg = new TextEncoder().encode(apiKey);
  if (msg.length > k - 11) throw new Error("API key too long for RSA key");
  const ps = new Uint8Array(k - 3 - msg.length);
  for (let i = 0; i < ps.length; i++) {
    let b = 0;
    while (b === 0) b = crypto.getRandomValues(new Uint8Array(1))[0];
    ps[i] = b;
  }
  const em = new Uint8Array(k);
  em[1] = 0x02;
  em.set(ps, 2);
  em.set(msg, 3 + ps.length);
  const m = BigInt("0x" + Array.from(em, (b) => b.toString(16).padStart(2, "0")).join(""));
  const hex = modPow(m, e, n).toString(16).padStart(k * 2, "0");
  let bin = "";
  for (let i = 0; i < hex.length; i += 2) bin += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  const token = btoa(bin);
  tokenCache = { key: cacheKey, token };
  return token;
}

async function call(url: string, init: RequestInit): Promise<{ status?: number; body: Record<string, string> | null; error?: string }> {
  const c = env();
  const token = await bearerToken(c.apiKey!, c.publicKey!);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Origin: c.origin },
      signal: AbortSignal.timeout(45_000),
    });
    const text = await res.text();
    let body: Record<string, string> | null = null;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    return { status: res.status, body };
  } catch (e) {
    return { body: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export const mpesaProvider: PayoutProvider = {
  id: "mpesa",
  environment: () => env().environment,
  isConfigured() {
    const c = env();
    return Boolean(c.apiKey && c.publicKey && c.serviceProviderCode);
  },
  normalizeAccount(input) {
    let d = input.replace(/\D/g, "");
    if (d.length === 9) d = "258" + d;
    return /^258(84|85)\d{7}$/.test(d) ? d : null;
  },
  async send(req: PayoutRequest): Promise<PayoutOutcome> {
    const c = env();
    const payload = {
      input_TransactionReference: req.reference,
      input_CustomerMSISDN: req.msisdn,
      input_Amount: String(req.amount),
      input_ThirdPartyReference: req.reference,
      input_ServiceProviderCode: c.serviceProviderCode,
    };
    const r = await call(`https://${HOSTS[c.environment]}:18345/ipg/v1x/b2cPayment/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return interpret(r, payload);
  },
  async query({ reference, queryReference }) {
    const c = env();
    const qs = new URLSearchParams({
      input_ThirdPartyReference: ("Q" + reference).slice(0, 20),
      input_QueryReference: queryReference,
      input_ServiceProviderCode: c.serviceProviderCode!,
    });
    const r = await call(`https://${HOSTS[c.environment]}:18353/ipg/v1x/queryTransactionStatus/?${qs}`, { method: "GET" });
    const code = r.body?.output_ResponseCode;
    const txStatus = r.body?.output_ResponseTransactionStatus;
    const raw = { response: r.body, error: r.error };
    if (code === "INS-0" && txStatus === "Completed")
      return { state: "success", transactionId: r.body?.output_TransactionID, conversationId: r.body?.output_ConversationID, code, raw, httpStatus: r.status };
    if (code === "INS-0" && (txStatus === "Cancelled" || txStatus === "Expired" || txStatus === "Failed"))
      return { state: "failed", code, reason: `Transaction ${txStatus}`, raw, httpStatus: r.status };
    return { state: "unknown", code, reason: r.error ?? r.body?.output_ResponseDesc ?? String(txStatus ?? "unknown"), raw, httpStatus: r.status };
  },
};

function interpret(r: Awaited<ReturnType<typeof call>>, payload: unknown): PayoutOutcome {
  const raw = { request: { ...(payload as object), input_CustomerMSISDN: "***" }, response: r.body, error: r.error };
  if (r.error || !r.body) return { state: "unknown", reason: r.error ?? "no_response", raw };
  const code = r.body.output_ResponseCode;
  if (code === "INS-0")
    return { state: "success", code, transactionId: r.body.output_TransactionID, conversationId: r.body.output_ConversationID, raw, httpStatus: r.status };
  if (!code || UNCERTAIN.has(code)) return { state: "unknown", code, reason: r.body.output_ResponseDesc ?? "uncertain", raw, httpStatus: r.status };
  return { state: "failed", code, reason: r.body.output_ResponseDesc ?? code, conversationId: r.body.output_ConversationID, raw, httpStatus: r.status };
}
