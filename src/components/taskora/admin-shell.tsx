import { useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { adminSections } from "@/lib/admin";
import { TaskoraMark } from "./logo";
import { useAuth } from "@/hooks/use-auth";


function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-0.5">
      {adminSections.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
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
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <TaskoraMark className="h-8 w-8" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold tracking-tight text-foreground">Taskora Admin</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Área restrita
        </p>
      </div>
    </div>
  );
}


export function AdminShell() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-[100rem]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/70 bg-background lg:flex">
          <div className="border-b border-border/70 px-4 py-3.5">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3">
            <NavList />
          </div>
          <div className="space-y-0.5 border-t border-border/70 px-2 py-3">
            <Link
              to="/app"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à aplicação
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Terminar sessão
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                  aria-label="Abrir menu administrativo"
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Menu className="h-[18px] w-[18px]" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[17rem] p-0">
                  <div className="flex h-full flex-col">
                    <div className="border-b border-border/70 px-4 py-3.5">
                      <Brand />
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 py-3">
                      <NavList onNavigate={() => setOpen(false)} />
                    </div>
                    <div className="space-y-0.5 border-t border-border/70 px-2 py-3">
                      <Link
                        to="/app"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar à aplicação
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Terminar sessão
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Brand />
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminPlaceholder({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background p-6">
      <p className="text-sm font-semibold text-foreground">Estrutura preparada</p>
      <p className="mt-1 text-sm text-muted-foreground">
        As funcionalidades desta área serão implementadas numa próxima fase.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground"
          >
            <span className="truncate">{item}</span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Em breve
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
