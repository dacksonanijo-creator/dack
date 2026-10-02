import { cn } from "@/lib/utils";
import { brandLogo, brandName } from "@/lib/brand";
import { useBranding } from "@/hooks/use-branding";

/**
 * Símbolo proprietário da TASKORA.
 *
 * A forma é desenhada em SVG diretamente no produto, sem biblioteca de ícones
 * ou imagem externa. As duas formas conectadas sugerem fluxo e conclusão,
 * enquanto o espaço negativo central cria uma leitura subtil de "T".
 */
function TaskoraOriginalMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="taskora-mark-gradient" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      <path
        d="M18 13h28c2.8 0 5 2.2 5 5v4H38v18c0 6.1-4.9 11-11 11h-4c-2.8 0-5-2.2-5-5V31c0-2.8 2.2-5 5-5h15v-5H18c-2.8 0-5-2.2-5-5s2.2-3 5-3Z"
        fill="url(#taskora-mark-gradient)"
      />
      <path
        d="M43 31h8v15c0 2.8-2.2 5-5 5h-3c-2.8 0-5-2.2-5-5V31h5Z"
        fill="#4F46E5"
        opacity=".18"
      />
      <circle cx="48" cy="18" r="4" fill="#16A34A" />
    </svg>
  );
}

/**
 * Marca (símbolo) da Taskora.
 * Se o administrador publicar um logótipo próprio, ele continua a ter
 * prioridade. Na ausência de uma imagem publicada, usa o símbolo oficial
 * desenhado no código da identidade TASKORA.
 */
export function TaskoraMark({ className }: { className?: string }) {
  const branding = useBranding();
  const alt = brandLogo.alt;
  const light = branding.logoLight ?? brandLogo.light;
  const dark = branding.logoDark ?? brandLogo.dark;

  if (light || dark) {
    const primary = light ?? dark!;
    const secondary = dark ?? light!;
    return (
      <span className={cn("relative block shrink-0", className)}>
        <img
          src={primary}
          alt={alt}
          className="h-full w-full object-contain dark:hidden"
          loading="eager"
          decoding="async"
        />
        <img
          src={secondary}
          alt={alt}
          className="hidden h-full w-full object-contain dark:block"
          loading="eager"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("block shrink-0 text-primary", className)}
    >
      <TaskoraOriginalMark className="h-full w-full" />
    </span>
  );
}

/**
 * Logótipo completo (símbolo + nome).
 */
export function TaskoraLogo({
  size = "md",
  className,
  showWordmark,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  showWordmark?: boolean;
}) {
  const branding = useBranding();
  const wordmark = showWordmark ?? branding.showWordmark;
  const mark = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <TaskoraMark className={mark} />
      {wordmark && (
        <span className={cn("truncate font-display font-extrabold tracking-[-0.035em]", text)}>
          {brandName.toUpperCase()}
        </span>
      )}
    </span>
  );
}
