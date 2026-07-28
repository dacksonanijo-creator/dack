import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type TaskState = "available" | "progress" | "submitted" | "approved" | "rejected";

export const stateLabels: Record<TaskState, string> = {
  available: "Disponível",
  progress: "Em andamento",
  submitted: "Em avaliação",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

export const stateClasses: Record<TaskState, string> = {
  available: "bg-primary/10 text-primary",
  progress: "bg-warning/15 text-warning",
  submitted: "bg-muted text-muted-foreground",
  approved: "bg-money/15 text-money",
  rejected: "bg-destructive/10 text-destructive",
};

interface Ctx {
  states: Record<string, TaskState>;
  getState: (id: string) => TaskState;
  setState: (id: string, state: TaskState) => void;
}

const TaskStateContext = createContext<Ctx | null>(null);

export function TaskStateProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<string, TaskState>>({});

  const value = useMemo<Ctx>(
    () => ({
      states,
      getState: (id) => states[id] ?? "available",
      setState: (id, state) => setStates((prev) => ({ ...prev, [id]: state })),
    }),
    [states],
  );

  return <TaskStateContext.Provider value={value}>{children}</TaskStateContext.Provider>;
}

export function useTaskStates() {
  const ctx = useContext(TaskStateContext);
  if (!ctx) throw new Error("useTaskStates must be used within TaskStateProvider");
  return ctx;
}
