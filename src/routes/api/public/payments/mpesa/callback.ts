import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

/**
 * Callback HTTPS para notificações assíncronas do M-Pesa.
 * URL a configurar no portal: /api/public/payments/mpesa/callback?token=<MPESA_CALLBACK_TOKEN>
 * O conteúdo recebido NÃO é confiado: apenas identifica o levantamento, e o estado
 * final é sempre confirmado pela consulta oficial (queryTransactionStatus).
 */
export const Route = createFileRoute("/api/public/payments/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["MPESA_CALLBACK_TOKEN"] ?? "";
        const got = new URL(request.url).searchParams.get("token") ?? "";
        if (!expected || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
          return new Response("Unauthorized", { status: 401 });
        }
        let body: Record<string, unknown> = {};
        try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
        const ref = String(body["output_ThirdPartyReference"] ?? body["input_ThirdPartyReference"] ?? "").slice(0, 40);
        if (!/^[A-Z0-9]{4,40}$/i.test(ref)) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: w } = await supabaseAdmin.from("withdrawals").select("id, provider").eq("reference", ref).maybeSingle();
        await supabaseAdmin.from("payout_logs").insert({
          withdrawal_id: w?.id ?? null, provider: "mpesa",
          environment: process.env["MPESA_ENV"] === "production" ? "production" : "sandbox",
          action: "callback", response: JSON.parse(JSON.stringify(body)),
        });
        if (w) {
          const { processWithdrawal } = await import("@/lib/payouts/processor.server");
          await processWithdrawal(w.id, "query");
        }
        return Response.json({ ok: true });
      },
    },
  },
});
