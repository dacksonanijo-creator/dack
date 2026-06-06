import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, LogOut, Sparkles, Menu, X, User, Wallet, Briefcase, Shield, LayoutDashboard, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const { isAdmin, isCompany } = useRoles();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

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
          {!user && (
            <>
              <a href="/#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.howItWorks")}
              </a>
              <a href="/#users" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.users")}
              </a>
              <a href="/#companies" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.companies")}
              </a>
            </>
          )}
          {user && (
            <>
              <Link to="/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.dashboard")}
              </Link>
              <Link to="/history" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.history")}
              </Link>
              {isCompany && (
                <Link to="/company" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t("nav.company")}
                </Link>
              )}
              {/* Admin link is intentionally hidden from main nav — admins access via profile dropdown */}
            </>
          )}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="profile">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> {t("nav.dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <User className="mr-2 h-4 w-4" /> {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/withdraw" })}>
                  <Wallet className="mr-2 h-4 w-4" /> {t("nav.withdraw")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/history" })}>
                  <History className="mr-2 h-4 w-4" /> {t("nav.history")}
                </DropdownMenuItem>
                {isCompany && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/company" })}>
                    <Briefcase className="mr-2 h-4 w-4" /> {t("nav.company")}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <Shield className="mr-2 h-4 w-4" /> {t("nav.admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-sm">
            {!user && (
              <>
                <a href="/#how" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.howItWorks")}</a>
                <a href="/#users" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.users")}</a>
                <a href="/#companies" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.companies")}</a>
                <Link to="/auth" search={{ mode: "login" }} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.login")}</Link>
              </>
            )}
            {user && (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.dashboard")}</Link>
                <Link to="/profile" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.profile")}</Link>
                <Link to="/withdraw" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.withdraw")}</Link>
                <Link to="/history" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.history")}</Link>
                {isCompany && <Link to="/company" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-accent">{t("nav.company")}</Link>}
                {/* Admin link hidden from mobile nav too */}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
