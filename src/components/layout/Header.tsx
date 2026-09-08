import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  FileSearch,
  LogIn,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getTheme, setTheme, wipeAllData } from "@/lib/storage";
import { PrivacyDialog } from "@/components/PrivacyDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/painel", label: "Painel" },
  { to: "/meu-curriculo", label: "Meu currículo" },
  { to: "/vagas", label: "Minhas vagas" },
  { to: "/analise", label: "Análise" },
  { to: "/entrevista/nova", label: "Entrevista" },
  { to: "/evolucao", label: "Minha evolução" },
  { to: "/como-funciona", label: "Como funciona" },
] as const;

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta");
    router.navigate({ to: "/", replace: true });
  };



  useEffect(() => {
    const current = getTheme();
    setThemeState(current);
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setThemeState(next);
    setTheme(next);
  };

  const handleWipe = () => {
    wipeAllData();
    setConfirmOpen(false);
    setMenuOpen(false);
    toast.success("Dados apagados", {
      description: "Sessão, análises e currículos deste dispositivo foram removidos.",
    });
    router.navigate({ to: "/" });
  };

  return (
    <header className="no-print sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-4 md:h-16">
        <Link to="/" className="flex items-center gap-2" aria-label="MatchCV, página inicial">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileSearch className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">MatchCV</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <PrivacyDialog
            trigger={
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Privacidade
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
          >
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>

          {user ? (
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </Button>
          ) : (
            <Button size="sm" className="hidden md:inline-flex" asChild>
              <Link to="/entrar">
                <LogIn className="size-4" aria-hidden="true" />
                Entrar
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Apagar meus dados
          </Button>


          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] overflow-y-auto sm:w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 px-4 pb-8">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium hover:bg-accent"
                    activeProps={{ className: "bg-accent" }}
                  >
                    {item.label}
                  </Link>
                ))}
                {user ? (
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="size-4" aria-hidden="true" />
                    Sair da conta
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/entrar" onClick={() => setMenuOpen(false)}>
                      <LogIn className="size-4" aria-hidden="true" />
                      Entrar ou criar conta
                    </Link>
                  </Button>
                )}
                <PrivacyDialog
                  trigger={
                    <Button variant="ghost" className="justify-start">
                      <ShieldCheck className="size-4" aria-hidden="true" />
                      Privacidade dos seus dados
                    </Button>
                  }
                />
                <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  Apagar meus dados
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os seus dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão removidos deste navegador: sessão atual, vagas analisadas, currículos gerados,
              versões salvas e o histórico desta sessão. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleWipe}>Apagar tudo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
