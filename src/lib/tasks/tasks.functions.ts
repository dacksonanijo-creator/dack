import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { TaskFeedResult } from "./types";

const inputSchema = z.object({
  country: z.string().trim().min(2).max(2).optional(),
});

/**
 * Lista unificada de tarefas vindas das redes externas configuradas.
 * As credenciais ficam apenas no servidor (variáveis de ambiente).
 */
export const listExternalTasks = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<TaskFeedResult> => {
    const { loadUnifiedTasks } = await import("./registry.server");
    return loadUnifiedTasks({ country: data.country?.toUpperCase() });
  });
