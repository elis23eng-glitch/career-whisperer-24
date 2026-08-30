import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare, Printer } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRing, scoreBand } from "@/components/ScoreRing";
import { RequirementsTab } from "@/components/result/RequirementsTab";
import { KeywordsTab } from "@/components/result/KeywordsTab";
import { GapsTab, RecommendationsTab } from "@/components/result/InsightsTabs";
import { AtsResumeTab } from "@/components/result/AtsResumeTab";
import { getAnalysis, saveAnalysis } from "@/lib/storage";
import type { AnalysisRecord, ConfirmedExperience } from "@/lib/types";

export const Route = createFileRoute("/resultado/$id")({
  head: () => ({
    meta: [
      { title: "Resultado da análise | MatchCV" },
      {
        name: "description",
        content:
          "Veja a compatibilidade entre seu currículo e a vaga, com requisitos, palavras-chave, lacunas e currículo ATS.",
      },
      { property: "og:title", content: "Resultado da análise | MatchCV" },
      {
        property: "og:description",
        content: "Score de compatibilidade, evidências e currículo otimizado para ATS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  experiencia: "Experiência",
  tecnicas: "Competências técnicas",
  responsabilidades: "Responsabilidades",
  formacao: "Formação",
  palavrasChave: "Palavras-chave",
  comportamentais: "Comportamentais",
  logistica: "Logística",
};

function ResultPage() {
  const { id } = Route.useParams();
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [applied, setApplied] = useState<Record<number, "aplicada" | "ignorada">>({});

  useEffect(() => {
    setRecord(getAnalysis(id) ?? null);
    setLoaded(true);
  }, [id]);

  const update = (next: AnalysisRecord) => {
    setRecord(next);
    saveAnalysis(next);
  };

  const confirmExperience = (item: ConfirmedExperience) => {
    if (!record) return;
    const others = record.confirmedExperiences.filter((c) => c.term !== item.term);
    update({ ...record, confirmedExperiences: [...others, item] });
  };

  if (!loaded) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">Carregando…</div>;
  }

  if (!record) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Análise não encontrada</h1>
        <p className="mt-3 text-muted-foreground">
          Este resultado não está salvo neste navegador. Os dados ficam apenas no seu dispositivo.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/analise">Fazer nova análise</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/curriculos">Meus currículos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { match, job } = record;
  const band = scoreBand(match.overallScore);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/curriculos">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Meus currículos
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/entrevista/nova" search={{}}>
              <MessageSquare className="size-4" aria-hidden="true" />
              Treinar entrevista para esta vaga
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.print();
              toast.info("Use “Salvar como PDF” na janela de impressão, se preferir.");
            }}
          >
            <Printer className="size-4" aria-hidden="true" />
            Imprimir
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">
            {job.jobTitle || "Vaga sem título identificado"}
          </CardTitle>
          <CardDescription>
            {[job.company, job.location, job.seniority].filter(Boolean).join(" • ") ||
              "Informação não identificada"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing score={match.overallScore} label="Compatibilidade" />
            <Badge>{band.label}</Badge>
            <p className="text-sm text-muted-foreground">
              Score ATS: <strong>{Math.round(match.atsScore)}/100</strong>
            </p>
          </div>
          <div className="space-y-4">
            {match.overview ? <p className="text-sm leading-relaxed">{match.overview}</p> : null}
            {match.scoreExplanation ? (
              <p className="text-sm text-muted-foreground">{match.scoreExplanation}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(match.categoryScores).map(([key, value]) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{CATEGORY_LABELS[key] ?? key}</span>
                    <span className="font-semibold">{Math.round(value)}%</span>
                  </div>
                  <Progress value={value} aria-label={CATEGORY_LABELS[key] ?? key} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pontos fortes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {match.strengths.length ? (
              match.strengths.map((s, i) => <p key={i}>• {s}</p>)
            ) : (
              <p className="text-muted-foreground">Informação não identificada.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pontos de atenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {match.attentionPoints.length ? (
              match.attentionPoints.map((s, i) => <p key={i}>• {s}</p>)
            ) : (
              <p className="text-muted-foreground">Informação não identificada.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Oportunidades de melhoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {match.improvementOpportunities.length ? (
              match.improvementOpportunities.map((s, i) => <p key={i}>• {s}</p>)
            ) : (
              <p className="text-muted-foreground">Informação não identificada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requisitos" className="mt-8">
        <TabsList className="no-print flex-wrap">
          <TabsTrigger value="requisitos">Requisitos</TabsTrigger>
          <TabsTrigger value="palavras">Palavras-chave</TabsTrigger>
          <TabsTrigger value="lacunas">Lacunas</TabsTrigger>
          <TabsTrigger value="recomendacoes">Recomendações</TabsTrigger>
          <TabsTrigger value="curriculo">Currículo ATS</TabsTrigger>
        </TabsList>
        <TabsContent value="requisitos" className="mt-6">
          <RequirementsTab match={match} />
        </TabsContent>
        <TabsContent value="palavras" className="mt-6">
          <KeywordsTab
            match={match}
            confirmed={record.confirmedExperiences}
            onConfirm={confirmExperience}
          />
        </TabsContent>
        <TabsContent value="lacunas" className="mt-6">
          <GapsTab match={match} />
        </TabsContent>
        <TabsContent value="recomendacoes" className="mt-6">
          <RecommendationsTab
            match={match}
            applied={applied}
            onApply={(index) => setApplied((p) => ({ ...p, [index]: "aplicada" }))}
            onIgnore={(index) => setApplied((p) => ({ ...p, [index]: "ignorada" }))}
          />
        </TabsContent>
        <TabsContent value="curriculo" className="mt-6">
          <AtsResumeTab record={record} onUpdate={update} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
