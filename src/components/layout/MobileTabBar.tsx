import { Link } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Briefcase, Mic, TrendingUp } from "lucide-react";

const TABS = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/meu-curriculo", label: "Currículo", icon: FileText },
  { to: "/vagas", label: "Vagas", icon: Briefcase },
  { to: "/entrevista/nova", label: "Entrevista", icon: Mic },
  { to: "/evolucao", label: "Evolução", icon: TrendingUp },
] as const;

export function MobileTabBar() {
  return (
    <nav
      aria-label="Navegação rápida"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="min-w-0">
              <Link
                to={tab.to}
                className="flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors active:bg-accent"
                activeProps={{ className: "text-primary" }}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="w-full truncate text-center">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
