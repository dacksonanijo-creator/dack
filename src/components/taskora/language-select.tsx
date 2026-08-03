import { Check, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/i18n";
import type { LocaleCode } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageSelect({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "compact";
}) {
  const { locale, setLocale, locales, t } = useLocale();
  const current = locales.find((l) => l.code === locale) ?? locales[0];

  const pick = (code: LocaleCode) => {
    if (code === locale) return;
    setLocale(code);
    toast.success(t("language.saved"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language.title")}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted",
          className,
        )}
      >
        <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{variant === "compact" ? current.short : current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => pick(l.code)}
            className="flex items-center gap-2 text-sm"
          >
            <span aria-hidden>{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {l.code === locale ? <Check className="h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
