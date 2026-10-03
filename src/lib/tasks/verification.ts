import { supabase } from "@/integrations/supabase/client";

export type TaskVerificationResult = {
  id: string;
  task_id: string;
  submission_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVIEW";
  value: number;
  currency: string;
};

export async function submitTaskForVerification(
  taskId: string,
  proof?: string,
  evidence: Record<string, unknown> = {},
): Promise<TaskVerificationResult> {
  const { data, error } = await (supabase as any).rpc("submit_task_for_verification", {
    p_task_id: taskId,
    p_proof: proof ?? null,
    p_evidence: evidence,
  });

  if (error) throw error;
  return data as TaskVerificationResult;
}
