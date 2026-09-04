import { Link } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

/** Mostra o conteúdo apenas para quem está com a conta aberta. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg items-center px-4 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Entre na sua conta</CardTitle>
            <CardDescription>
              Suas vagas, currículos, entrevistas e relatórios ficam guardados na sua conta. Assim
              nada se perde ao recarregar a página ou trocar de aparelho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="w-full">
              <Link to="/entrar">
                <LogIn className="size-4" aria-hidden="true" />
                Entrar ou criar conta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
