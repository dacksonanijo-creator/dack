export async function processWithdrawal(id: string, mode: "send" | "query") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getPayoutProvider } = await import("./registry.server");
  const { data: w } = await supabaseAdmin.from("withdrawals").select("*").eq("id", id).single();
  if (!w) return;
  const provider = getPayoutProvider(w.provider ?? w.method);
  if (!provider || !provider.isConfigured()) return;
  const environment = provider.environment();

  let outcome;
  if (mode === "send") {
    const { data: locked } = await supabaseAdmin.rpc("mark_withdrawal_processing", { _id: id, _environment: environment });
    if (!locked) return; // já enviado por outro pedido → evita duplicado
    outcome = await provider.send({ reference: w.reference!, msisdn: w.account_number, amount: Number(w.amount) });
  } else {
    if (w.status !== "processing") return;
    outcome = await provider.query({ reference: w.reference!, queryReference: w.transaction_id ?? w.provider_conversation_id ?? w.reference! });
  }

  await supabaseAdmin.from("payout_logs").insert({
    withdrawal_id: id, provider: provider.id, environment, action: mode,
    response: JSON.parse(JSON.stringify({ state: outcome.state, code: outcome.code, raw: outcome.raw })),
    http_status: outcome.httpStatus ?? null,
  });
  console.log(`[payout] ${provider.id}/${environment} ${mode} ${w.reference} -> ${outcome.state} ${outcome.code ?? ""}`);

  if (outcome.state === "success" || outcome.state === "failed") {
    await supabaseAdmin.rpc("finalize_withdrawal", {
      _id: id,
      _success: outcome.state === "success",
      _transaction_id: outcome.state === "success" ? outcome.transactionId ?? null : null,
      _conversation_id: outcome.conversationId ?? null,
      _response_code: outcome.code ?? null,
      _reason: outcome.state === "failed" ? outcome.reason : null,
    } as never);
  }
}

