import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Home, ListChecks, User } from "lucide-react";
import { TaskoraLogo } from "./logo";
import { user, notifications } from "./mock-data";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/tasks", label: "Tarefas", icon: ListChecks, exact: false },
  { to: "/app/notifications", label: "Alertas", icon: Bell, exact: false },
  { to: "/app/profile", label: "Perfil", icon: User, exact: false },
] as const;

export function Avatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-accent text-sm font-bold text-primary-foreground",
        className,
      )}
    >
      {user.initials}
    </span>
  );
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/app" className="min-w-0">
            <TaskoraLogo size="sm" />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <nav className="mr-2 hidden items-center gap-1 md:flex">
              {nav.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Link
              to="/app/notifications"
              aria-label="Notificações"
              className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-money px-1 text-[10px] font-bold text-success-foreground">
                  {unread}
                </span>
              )}
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
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-14 place-items-center rounded-full transition-colors",
                    active && "bg-primary/10",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
