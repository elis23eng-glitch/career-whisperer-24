import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LineChart, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  deleteInterview,
  listInterviews,
  subscribeInterviewStore,
} from "@/lib/interview/store";
import { INTERVIEW_TYPE_LABELS, type InterviewSession } from "@/lib/interview/schemas";

export const Route = createFileRoute("/evolucao")({
  head: () => ({
    meta: [
      { title: "Minha evolução | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Acompanhe o histórico das suas entrevistas simuladas, a média de desempenho e o que já melhorou ao longo do tempo.",
      },
      { property: "og:title", content: "Minha evolução | MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Histórico e progresso das suas simulações de entrevista.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvolutionPage,
});

function EvolutionPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => setSessions(listInterviews());
    refresh();
    setReady(true);
    return subscribeInterviewStore(refresh);
  }, []);

  const scored = useMemo(
    () => sessions.filter((s) => typeof s.averageScore === "number"),
    [sessions],
  );

  const average = useMemo(() => {
    if (!scored.length) return undefined;
    return scored.reduce((sum, s) => sum + (s.averageScore ?? 0), 0) / scored.length;
  }, [scored]);

  const trend = useMemo(() => {
    if (scored.length < 2) return undefined;
    const first = scored[scored.length - 1]?.averageScore ?? 0;
    const last = scored[0]?.averageScore ?? 0;
    return last - first;
  }, [scored]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minha evolução</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Aqui você acompanha todas as entrevistas simuladas que já fez, a média das notas e o que
          vem melhorando. Treinar mais de uma vez ajuda a ganhar confiança.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Simulações concluídas</CardDescription>
            <CardTitle className="text-3xl">
              {sessions.filter((s) => s.status === "concluida").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Média geral</CardDescription>
            <CardTitle className="text-3xl">
              {average ? `${average.toFixed(1)}/5` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={average ? (average / 5) * 100 : 0} aria-hidden="true" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Variação desde a primeira</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              {trend === undefined ? (
                "—"
              ) : (
                <>
                  <TrendingUp
                    className={trend >= 0 ? "size-6 text-success" : "size-6 text-warning"}
                    aria-hidden="true"
                  />
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link to="/entrevista/nova" search={{}}>
            <Sparkles className="size-4" aria-hidden="true" />
            Nova entrevista simulada
          </Link>
        </Button>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Histórico</h2>

      {!ready ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <LineChart className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              Você ainda não fez nenhuma entrevista simulada. Comece a primeira para começar a
              registrar sua evolução.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{s.jobTitle}</CardTitle>
                    <CardDescription>
                      {new Date(s.createdAt).toLocaleDateString("pt-BR")} •{" "}
                      {INTERVIEW_TYPE_LABELS[s.config.type]} •{" "}
                      {s.turns.filter((t) => t.answer).length} de {s.config.questionCount} respostas
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof s.averageScore === "number" ? (
                      <Badge>{s.averageScore.toFixed(1)}/5</Badge>
                    ) : null}
                    <Badge variant={s.status === "concluida" ? "secondary" : "outline"}>
                      {s.status === "concluida" ? "Concluída" : "Em andamento"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {s.report ? (
                  <Button asChild variant="outline">
                    <Link to="/entrevista/$id/relatorio" params={{ id: s.id }}>
                      Ver relatório
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/entrevista/$id" params={{ id: s.id }}>
                      Continuar entrevista
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost">
                  <Link
                    to="/entrevista/nova"
                    search={{ vaga: s.jobId, curriculo: s.resumeId, tipo: s.config.type }}
                  >
                    Refazer
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    deleteInterview(s.id);
                    toast.success("Registro removido.");
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Excluir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
