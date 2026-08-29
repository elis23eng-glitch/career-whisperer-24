import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  FileText,
  Gauge,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAnalyses } from "@/lib/storage";
import {
  listInterviews,
  listJobs,
  listResumes,
  subscribeInterviewStore,
  syncFromAnalyses,
} from "@/lib/interview/store";
import type { InterviewSession, SavedJob, SavedResume } from "@/lib/interview/schemas";
import type { AnalysisRecord } from "@/lib/types";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Seu painel central: currículo, vagas salvas, análises de compatibilidade, entrevistas simuladas e evolução em um só lugar.",
      },
      { property: "og:title", content: "Painel | MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Acompanhe currículo, vagas, análises e entrevistas simuladas com IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);

  useEffect(() => {
    syncFromAnalyses();
    const refresh = () => {
      setJobs(listJobs());
      setResumes(listResumes());
      setInterviews(listInterviews());
      setAnalyses(listAnalyses());
    };
    refresh();
    return subscribeInterviewStore(refresh);
  }, []);

  const scored = interviews.filter((i) => typeof i.averageScore === "number");
  const average = scored.length
    ? scored.reduce((sum, i) => sum + (i.averageScore ?? 0), 0) / scored.length
    : undefined;
  const lastAnalysis = analyses[0];
  const lastInterview = interviews[0];

  const steps = [
    {
      done: resumes.length > 0,
      title: "Adicione seu currículo",
      description: "Importe um PDF ou DOCX, ou cole o texto do seu currículo.",
      to: "/meu-curriculo" as const,
      cta: "Ir para Meu currículo",
    },
    {
      done: jobs.length > 0,
      title: "Cadastre uma vaga",
      description: "Cole o anúncio da vaga que você quer conquistar.",
      to: "/vagas" as const,
      cta: "Ir para Minhas vagas",
    },
    {
      done: analyses.length > 0,
      title: "Analise a compatibilidade",
      description: "Veja seu índice de aderência e o que melhorar no currículo.",
      to: "/analise" as const,
      cta: "Fazer análise",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Seu painel</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Tudo o que você precisa para se preparar: currículo, vagas, análise de compatibilidade e
          entrevistas simuladas com o Agente Recrutador.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="size-4" aria-hidden="true" />
              Currículos
            </CardDescription>
            <CardTitle className="text-3xl">{resumes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Briefcase className="size-4" aria-hidden="true" />
              Vagas salvas
            </CardDescription>
            <CardTitle className="text-3xl">{jobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquare className="size-4" aria-hidden="true" />
              Entrevistas
            </CardDescription>
            <CardTitle className="text-3xl">{interviews.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="size-4" aria-hidden="true" />
              Média nas entrevistas
            </CardDescription>
            <CardTitle className="text-3xl">{average ? `${average.toFixed(1)}/5` : "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Card className="border-primary/40 bg-accent/40">
          <CardHeader>
            <CardTitle className="text-xl">Treinar entrevista</CardTitle>
            <CardDescription>
              O Agente Recrutador faz perguntas baseadas na vaga e no seu currículo e dá feedback
              claro em cada resposta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link to="/entrevista/nova" search={{}}>
                <Sparkles className="size-4" aria-hidden="true" />
                Começar simulação
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Analisar currículo e vaga</CardTitle>
            <CardDescription>
              Descubra seu índice de compatibilidade e gere uma versão do currículo direcionada à
              vaga.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" variant="outline">
              <Link to="/analise">
                <Gauge className="size-4" aria-hidden="true" />
                Fazer análise
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Próximos passos</h2>
      <div className="mb-8 grid gap-3">
        {steps.map((step) => (
          <Card key={step.title}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  {step.done ? <Badge variant="secondary">Feito</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </div>
              <Button asChild variant={step.done ? "ghost" : "default"}>
                <Link to={step.to}>
                  {step.cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Última análise</CardTitle>
          </CardHeader>
          <CardContent>
            {lastAnalysis ? (
              <div className="space-y-3">
                <p className="font-medium">{lastAnalysis.job.jobTitle}</p>
                <p className="text-sm text-muted-foreground">
                  Compatibilidade: {lastAnalysis.match.overallScore}% •{" "}
                  {new Date(lastAnalysis.createdAt).toLocaleDateString("pt-BR")}
                </p>
                <Button asChild variant="outline">
                  <Link to="/resultado/$id" params={{ id: lastAnalysis.id }}>
                    Abrir resultado
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma análise ainda. Faça a primeira para ver seu índice de compatibilidade.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Última entrevista</CardTitle>
          </CardHeader>
          <CardContent>
            {lastInterview ? (
              <div className="space-y-3">
                <p className="font-medium">{lastInterview.jobTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(lastInterview.createdAt).toLocaleDateString("pt-BR")} •{" "}
                  {lastInterview.status === "concluida" ? "Concluída" : "Em andamento"}
                </p>
                <Button asChild variant="outline">
                  {lastInterview.report ? (
                    <Link to="/entrevista/$id/relatorio" params={{ id: lastInterview.id }}>
                      Ver relatório
                    </Link>
                  ) : (
                    <Link to="/entrevista/$id" params={{ id: lastInterview.id }}>
                      Continuar
                    </Link>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma simulação ainda. Treine a primeira entrevista quando quiser.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
