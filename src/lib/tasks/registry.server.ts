import { cpagripProvider } from "./providers/cpagrip.server";
import type { TaskProvider } from "./providers/types.server";
import type { TaskFeedResult, UnifiedTask } from "./types";

/**
 * Registo de redes de tarefas. Adicionar aqui novas redes
 * (AdGate Media, OfferToro, AyeT Studios, ...) sem tocar na UI.
 */
const providers: TaskProvider[] = [cpagripProvider];

export async function loadUnifiedTasks(options: { country?: string } = {}): Promise<TaskFeedResult> {
  const active = providers.filter((p) => p.isConfigured());

  if (active.length === 0) {
    return { tasks: [], providers: [], failed: [], notConfigured: true };
  }

  const tasks: UnifiedTask[] = [];
  const ok: string[] = [];
  const failed: string[] = [];

  const results = await Promise.allSettled(
    active.map(async (p) => ({ slug: p.slug, tasks: await p.fetchTasks(options) })),
  );

  for (const [index, result] of results.entries()) {
    const provider = active[index]!;
    if (result.status === "fulfilled") {
      ok.push(provider.slug);
      tasks.push(...result.value.tasks);
    } else {
      failed.push(provider.slug);
      console.error(`[tasks] provider ${provider.slug} falhou:`, result.reason);
    }
  }

  return { tasks, providers: ok, failed, notConfigured: false };
}
