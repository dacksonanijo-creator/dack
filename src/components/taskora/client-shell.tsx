import { useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  ClipboardList,
  FilePlus2,
  LogOut,
  Menu,
  Settings,
  User,
} from "lucide-react";
import { TaskoraLogo } from "./logo";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";

const menuGroups = [
  {
    label: "Painel",
    items: [
      { to: "/client", label: "Resumo", icon: BriefcaseBusiness, exact: true },
      { to: "/client/tasks", label: "Minhas tarefas", icon: ClipboardList, exact: false },
      { to: "/client/tasks/new", label: "Criar tarefa", icon: FilePlus2, exact: false },
    ],
  },
  {
    label: "Análise",
    items: [
      { to: "/client/stats", label: "Estatísticas", icon: ChartNoAxesColumn, exact: false },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/client/profile", label: "Perfil empresarial", icon: User, exact: false },
      { to: "/client/notifications", label: "Notificações", icon: Bell, exact: false },
      { to: "/client/settings", label: "Definições", icon: Settings, exact: false },
    ],
  },
] as const;

const tabs = [
  { to: "/client", label: "Resumo", icon: BriefcaseBusiness, exact: true },
  { to: "/client/tasks", label: "Tarefas", icon: ClipboardList, exact: false },
  { to: "/client/tasks/new", label: "Criar", icon: FilePlus2, exact: false },
  { to: "/client/profile", label: "Perfil", icon: User, exact: false },
] as const;

export function ClientShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-6">
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
                <div className="border-b border-border/70 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Painel empresarial
                  </p>
                  <p className="mt-1 text-sm font-semibold">Conta de empresa</p>
                </div>
                <nav className="flex-1 overflow-y-auto px-2 py-3">
                  {menuGroups.map((group) => (
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

          <Link to="/client" className="min-w-0 justify-self-start">
            <TaskoraLogo size="sm" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              to="/client/notifications"
              aria-label="Notificações"
              className="relative grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
            </Link>
            <Link
              to="/client/settings"
              aria-label="Definições"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
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
