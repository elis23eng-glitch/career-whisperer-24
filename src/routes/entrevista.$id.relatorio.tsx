import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award, Info, ListChecks, Target } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getInterview } from "@/lib/interview/store";
import { INTERVIEW_TYPE_LABELS, type InterviewSession } from "@/lib/interview/schemas";

export const Route = createFileRoute("/entrevista/$id/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório da entrevista | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Veja seu desempenho na entrevista simulada: pontos fortes, pontos a desenvolver, plano de ação e sugestões de estudo.",
      },
      { property: "og:title", content: "Relatório da entrevista | MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Relatório detalhado com plano de ação para a sua próxima entrevista.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-base">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

function ReportPage() {
  const { id } = Route.useParams();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSession(getInterview(id) ?? null);
    setLoaded(true);
  }, [id]);

  if (!loaded) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Carregando…</div>;
  }

  if (!session?.report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Relatório não encontrado</h1>
        <p className="mt-3 text-muted-foreground">
          Não encontramos este relatório neste aparelho. Faça uma nova simulação para gerar outro.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/entrevista/nova" search={{}}>
              Nova entrevista
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/evolucao">Minha evolução</Link>
          </Button>
        </div>
      </div>
    );
  }

  const report = session.report;
  const average = session.averageScore;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Badge variant="secondary" className="mb-3">
          {INTERVIEW_TYPE_LABELS[session.config.type]} •{" "}
          {new Date(session.createdAt).toLocaleDateString("pt-BR")}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">Relatório da entrevista</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {session.jobTitle}
          {session.company ? ` — ${session.company}` : ""}
        </p>
      </header>

      <Alert className="mb-6">
        <Info className="size-4" aria-hidden="true" />
        <AlertTitle>Análise educativa gerada por IA</AlertTitle>
        <AlertDescription>
          Este relatório serve para você treinar e evoluir. Ele não substitui a avaliação de uma
          empresa real e não garante aprovação em processos seletivos.
        </AlertDescription>
      </Alert>

      {typeof average === "number" ? (
        <Card className="mb-6 border-primary/40 bg-accent/40">
          <CardHeader>
            <CardTitle className="text-xl">Desempenho geral</CardTitle>
            <CardDescription>Média das respostas avaliadas nesta simulação.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{average.toFixed(1)}
              <span className="text-lg font-normal text-muted-foreground"> / 5</span>
            </p>
            <Progress className="mt-3" value={(average / 5) * 100} aria-hidden="true" />
          </CardContent>
        </Card>
      ) : null}

      {(() => {
        const voiceTurns = session.turns.filter((t) => t.source === "voz");
        if (!voiceTurns.length) return null;
        const totalSec = voiceTurns.reduce((sum, t) => sum + (t.durationSec ?? 0), 0);
        const repeats = session.turns.reduce((sum, t) => sum + (t.repeats ?? 0), 0);
        const avgSec = Math.round(totalSec / voiceTurns.length);
        return (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Sua entrevista por voz</CardTitle>
              <CardDescription>
                Dados de apoio ao treino. Nenhuma gravação foi armazenada — apenas as transcrições
                que você confirmou.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-base">
              <p>
                <strong>Respostas faladas:</strong> {voiceTurns.length} de {session.turns.length}
              </p>
              <p>
                <strong>Tempo médio por resposta falada:</strong> {avgSec} segundos
              </p>
              <p>
                <strong>Perguntas repetidas em áudio:</strong> {repeats}
              </p>
              <p>
                <strong>Idioma da simulação:</strong>{" "}
                {session.config.language === "en-US" ? "Inglês" : "Português do Brasil"}
              </p>
            </CardContent>
          </Card>
        );
      })()}


      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Resumo do seu desempenho</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <p className="text-base whitespace-pre-line">{report.summary}</p>
          <Separator />
          <List title="Pontos fortes" items={report.strengths} />
          <List title="Competências demonstradas" items={report.competencies} />
          <List title="Pontos a desenvolver" items={report.developmentAreas} />
        </CardContent>
      </Card>

      {report.strongestAnswers.length || report.answersToRedo.length ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Respostas em destaque</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            {report.strongestAnswers.length ? (
              <section>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Award className="size-4 text-success" aria-hidden="true" />
                  Melhores respostas
                </h3>
                <ul className="grid gap-3">
                  {report.strongestAnswers.map((a, i) => (
                    <li key={i} className="rounded-lg border p-3">
                      <p className="font-medium">{a.question}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{a.why}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {report.answersToRedo.length ? (
              <section>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Target className="size-4 text-warning" aria-hidden="true" />
                  Respostas que vale refazer
                </h3>
                <ul className="grid gap-3">
                  {report.answersToRedo.map((a, i) => (
                    <li key={i} className="rounded-lg border p-3">
                      <p className="font-medium">{a.question}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{a.why}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListChecks className="size-5" aria-hidden="true" />
            Plano de ação
          </CardTitle>
          <CardDescription>As 3 prioridades para a sua próxima entrevista.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ol className="grid gap-3">
            {report.actionPlan.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-lg border p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-medium">{step.action}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{step.why}</span>
                </span>
              </li>
            ))}
          </ol>
          <Separator />
          <List title="Perguntas que exigiram mais preparo" items={report.hardestQuestions} />
          <List title="Dicas para a entrevista real" items={report.realInterviewTips} />
          <List title="Sugestões de estudo e prática" items={report.studySuggestions} />
        </CardContent>
      </Card>

      {report.evolution ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Comparação com simulações anteriores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base whitespace-pre-line">{report.evolution}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link
            to="/entrevista/nova"
            search={{ vaga: session.jobId, curriculo: session.resumeId }}
          >
            Refazer entrevista desta vaga
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/entrevista/nova" search={{ vaga: session.jobId, fracas: true }}>
            Treinar só os pontos fracos
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link to="/evolucao">Ver minha evolução</Link>
        </Button>
      </div>
    </div>
  );
}
