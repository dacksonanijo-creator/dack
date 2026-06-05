import { Link } from "@tanstack/react-router";
import { Globe, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Taskora</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="/#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.howItWorks")}
          </a>
          <a href="/#users" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.users")}
          </a>
          <a href="/#companies" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.companies")}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Globe className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">{lang}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang("pt")}>Português</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("en")}>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "login" }}>{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Link to="/auth" search={{ mode: "signup" }}>{t("nav.signup")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
