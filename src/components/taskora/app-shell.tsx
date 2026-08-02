import { useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Banknote,
  Bell,
  CircleHelp,
  Gift,
  Home,
  Info,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  User,
  Wallet,
} from "lucide-react";
import { TaskoraLogo } from "./logo";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";

const tabs = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/tasks", label: "Tarefas", icon: ListChecks, exact: false },
  { to: "/app/wallet", label: "Carteira", icon: Wallet, exact: false },
  { to: "/app/profile", label: "Perfil", icon: User, exact: false },
] as const;

const groups = [
  {
    label: "Principal",
    items: [
      { to: "/app", label: "Início", icon: Home, exact: true },
      { to: "/app/tasks", label: "Tarefas", icon: ListChecks, exact: false },
      { to: "/app/wallet", label: "Carteira", icon: Wallet, exact: false },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/app/profile", label: "Perfil", icon: User, exact: false },
      { to: "/app/withdrawals", label: "Saques", icon: Banknote, exact: false },
      { to: "/app/activity", label: "Atividade", icon: Activity, exact: false },
      { to: "/app/rewards", label: "Recompensas", icon: Gift, exact: false },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/app/notifications", label: "Notificações", icon: Bell, exact: false },
      { to: "/app/settings", label: "Definições", icon: Settings, exact: false },
      { to: "/app/help", label: "Ajuda", icon: CircleHelp, exact: false },
      { to: "/about", label: "Sobre a Taskora", icon: Info, exact: false },
    ],
  },
] as const;

export function Avatar({ className }: { className?: string }) {
  const { initials } = useProfile();
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-accent text-xs font-bold text-primary-foreground",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-gradient-hero pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Abrir menu"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Menu className="h-[18px] w-[18px]" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[17rem] p-0">
              <div className="flex h-full flex-col">
                <div className="border-b border-border/70 px-4 py-3.5">
                  <TaskoraLogo size="sm" />
                </div>
                <nav className="flex-1 overflow-y-auto px-2 py-3">
                  {groups.map((group) => (
                    <div key={group.label} className="mb-3">
                      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const active = isActive(item.to, item.exact);
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="mb-1">
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Sessão
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setOpen(false);
                        await signOut();
                        navigate({ to: "/login", replace: true });
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Terminar sessão
                    </button>
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/app" className="min-w-0 justify-self-start">
            <TaskoraLogo size="sm" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              to="/app/notifications"
              aria-label="Notificações"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
            </Link>
            <Link to="/app/profile" aria-label="Perfil">
              <Avatar />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
