export type ProcessWithdrawalResult =
  | { ok: true; state: "paid" | "failed" | "processing" }
  | { ok: false; error: "not_found" | "provider_not_configured" | "not_approved" | "already_processing" | "provider_error"; detail?: string };

export async function processWithdrawal(id: string, mode: "send" | "query"): Promise<ProcessWithdrawalResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getPayoutProvider } = await import("./registry.server");

  const { data: w, error: loadError } = await supabaseAdmin.from("withdrawals").select("*").eq("id", id).single();
  if (loadError || !w) return { ok: false, error: "not_found" };

  const provider = getPayoutProvider(w.provider ?? w.method);
  if (!provider || !provider.isConfigured()) return { ok: false, error: "provider_not_configured" };

  if (mode === "send") {
    if (w.status !== "approved") return { ok: false, error: "not_approved" };
  } else if (w.status !== "processing") {
    return { ok: false, error: "already_processing" };
  }

  const environment = provider.environment();
  if (mode === "send") {
    const { data: locked, error: lockError } = await supabaseAdmin.rpc("mark_withdrawal_processing", {
      _id: id,
      _environment: environment,
    });
    if (lockError) return { ok: false, error: "provider_error", detail: lockError.message };
    if (!locked) return { ok: false, error: "already_processing" };
  }

  const current = mode === "send" ? w : { ...w };
  let outcome;
  if (mode === "send") {
    outcome = await provider.send({
      reference: current.reference!,
      msisdn: current.account_number,
      amount: Number(current.amount),
    });
  } else {
    outcome = await provider.query({
      reference: current.reference!,
      queryReference: current.transaction_id ?? current.provider_conversation_id ?? current.reference!,
    });
  }

  await supabaseAdmin.from("payout_logs").insert({
    withdrawal_id: id,
    provider: provider.id,
    environment,
    action: mode,
    response: JSON.parse(JSON.stringify({ state: outcome.state, code: outcome.code, raw: outcome.raw })),
    http_status: outcome.httpStatus ?? null,
  });

  if (outcome.state === "success") {
    const { error } = await supabaseAdmin.rpc("finalize_withdrawal", {
      _id: id,
      _success: true,
      _transaction_id: outcome.transactionId ?? null,
      _conversation_id: outcome.conversationId ?? null,
      _response_code: outcome.code ?? null,
      _reason: null,
    });
    return error ? { ok: false, error: "provider_error", detail: error.message } : { ok: true, state: "paid" };
  }

  if (outcome.state === "failed") {
    const { error } = await supabaseAdmin.rpc("finalize_withdrawal", {
      _id: id,
      _success: false,
      _transaction_id: null,
      _conversation_id: outcome.conversationId ?? null,
      _response_code: outcome.code ?? null,
      _reason: outcome.reason,
    });
    return error ? { ok: false, error: "provider_error", detail: error.message } : { ok: true, state: "failed" };
  }

  return { ok: true, state: "processing" };
}
