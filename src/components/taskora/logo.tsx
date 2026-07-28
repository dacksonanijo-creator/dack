import { cn } from "@/lib/utils";

export function TaskoraMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]" aria-hidden="true">
        <path
          d="M4 12.8 9.2 18 20 6.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function TaskoraLogo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const mark = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <TaskoraMark className={mark} />
      <span className={cn("font-display font-extrabold tracking-tight", text)}>Taskora</span>
    </span>
  );
}
