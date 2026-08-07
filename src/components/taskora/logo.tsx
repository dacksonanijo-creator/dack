import { cn } from "@/lib/utils";
import { brandLogo, brandName } from "@/lib/brand";
import { useBranding } from "@/hooks/use-branding";

/**
 * Marca (símbolo) da Taskora.
 * Mostra o logótipo publicado pelo administrador (Painel Admin › Logótipo)
 * ou, na sua ausência, o definido em `src/lib/brand.ts`.
 * A imagem nunca é distorcida: usa `object-contain` e mantém proporções.
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
      aria-label={`${alt} (espaço reservado)`}
      title="Insere aqui o teu logótipo em src/lib/brand.ts"
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border border-dashed border-border bg-muted/60 p-1 text-center text-muted-foreground",
        className,
      )}
    >
      <span className="text-[8px] font-semibold uppercase leading-tight tracking-wide">
        Logo
      </span>
    </span>
  );
}

/**
 * Logótipo completo (marca + nome). Adapta-se ao espaço disponível.
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
        <span className={cn("truncate font-display font-extrabold tracking-tight", text)}>
          {brandName}
        </span>
      )}
    </span>
  );
}
