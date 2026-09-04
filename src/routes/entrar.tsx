import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Entre na sua conta do MatchCV Recruiter para guardar currículos, vagas, entrevistas e relatórios com segurança.",
      },
      { property: "og:title", content: "Entrar no MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Acesse sua conta para manter suas entrevistas e relatórios sempre salvos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EntrarPage,
});

function EntrarPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/painel", replace: true });
  }, [user, loading, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    void navigate({ to: "/painel", replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    if (!data.session) {
      setSent(true);
      toast.success("Confira seu e-mail", {
        description: "Enviamos um link de confirmação para liberar o acesso.",
      });
      return;
    }
    void navigate({ to: "/painel", replace: true });
  };

  const withGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Não foi possível entrar com o Google");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
    void navigate({ to: "/painel", replace: true });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Sua conta MatchCV</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Com a conta aberta, suas vagas, currículos, entrevistas e relatórios ficam guardados e não
          se perdem ao recarregar a página.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acesso</CardTitle>
          <CardDescription>Use e-mail e senha ou sua conta Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button variant="outline" className="w-full" onClick={withGoogle} disabled={busy}>
            Continuar com o Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          {sent ? (
            <p className="rounded-md bg-secondary p-4 text-sm">
              Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail para
              liberar sua conta e depois volte aqui para entrar.
            </p>
          ) : (
            <Tabs defaultValue="entrar">
              <TabsList className="w-full">
                <TabsTrigger value="entrar" className="flex-1">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="criar" className="flex-1">
                  Criar conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                <form className="space-y-4 pt-4" onSubmit={signIn}>
                  <Fields
                    email={email}
                    password={password}
                    onEmail={setEmail}
                    onPassword={setPassword}
                  />
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="criar">
                <form className="space-y-4 pt-4" onSubmit={signUp}>
                  <Fields
                    email={email}
                    password={password}
                    onEmail={setEmail}
                    onPassword={setPassword}
                  />
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Criar minha conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Fields({
  email,
  password,
  onEmail,
  onPassword,
}: {
  email: string;
  password: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => onEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => onPassword(e.target.value)}
        />
      </div>
    </>
  );
}
