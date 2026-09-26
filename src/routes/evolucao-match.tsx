import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAnalyses, subscribeStorage } from "@/lib/storage";
import type { AnalysisRecord } from "@/lib/types";
import { keywordCoverage, nicheLabel, nicheTerms, resumeToText, type Niche } from "@/lib/niches";

export const Route = createFileRoute("/evolucao-match")({
  head: () => ({
    meta: [
      { title: "Evolução do match | MatchCV Recruiter" },
      { name: "description", content: "Veja como o match do seu currículo com cada vaga evoluiu entre a versão original e as versões direcionadas." },
      { property: "og:title", content: "Evolução do match | MatchCV Recruiter" },
      { property: "og:description", content: "Compare o match entre versões do seu currículo e acompanhe o histórico das análises." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MatchEvolution,
});

function termsFor(a: AnalysisRecord) {
  const jobTerms = a.job.keywords.map((k) => k.term);
  const niche = (a.niche ?? "geral") as Niche;
  const jobNorm = a.job.rawDescription.toLowerCase();
  const nicheInJob = nicheTerms(niche).filter((t) => jobNorm.includes(t.toLowerCase()));
  return [...jobTerms, ...nicheInJob];
}

function versionScores(a: AnalysisRecord) {
  const terms = termsFor(a);
  return a.versions.map((v, i) => ({
    name: v.isOriginal ? "Original" : v.name || `Versão ${i + 1}`,
    cobertura: keywordCoverage(resumeToText(v.content), terms),
  }));
}

function MatchEvolution() {
  const [items, setItems] = useState<AnalysisRecord[]>([]);
  useEffect(() => {
    const load = () => setItems(listAnalyses());
    load();
    const unsub = subscribeStorage(load);
    return () => {
      unsub();
    };
  }, []);

  const timeline = useMemo(
    () =>
      [...items].reverse().map((a) => ({
        data: new Date(a.createdAt).toLocaleDateString("pt-BR"),
        match: Math.round(a.match.overallScore ?? 0),
        ats: Math.round(a.match.atsScore ?? 0),
      })),
    [items],
  );

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Evolução do match</h1>
        <p className="mt-3 text-muted-foreground">Faça sua primeira análise para acompanhar a evolução.</p>
        <Button asChild className="mt-6"><Link to="/analise">Nova análise</Link></Button>
      </div>
    );
  }

  const avg = Math.round(items.reduce((s, a) => s + (a.match.overallScore ?? 0), 0) / items.length);
  const best = Math.max(...items.map((a) => a.match.overallScore ?? 0));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">Evolução do match</h1>
        <p className="text-muted-foreground">Histórico das suas análises e comparação entre versões do currículo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Análises salvas" value={String(items.length)} />
        <Stat label="Match médio" value={`${avg}%`} />
        <Stat label="Melhor match" value={`${Math.round(best)}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match ao longo do tempo</CardTitle>
          <CardDescription>Score de compatibilidade e score ATS de cada análise.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="data" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="match" name="Match" stroke="var(--primary)" strokeWidth={2} />
              <Line type="monotone" dataKey="ats" name="ATS" stroke="var(--success, var(--accent-foreground))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((a) => {
          const data = versionScores(a);
          const first = data[0]?.cobertura ?? 0;
          const last = data[data.length - 1]?.cobertura ?? 0;
          const diff = last - first;
          return (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{nicheLabel(a.niche)}</Badge>
                  <Badge variant="outline">Match {Math.round(a.match.overallScore ?? 0)}%</Badge>
                  {data.length > 1 ? (
                    <Badge variant={diff >= 0 ? "default" : "destructive"}>
                      {diff >= 0 ? "+" : ""}{diff} pts de palavras-chave
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="text-lg">{a.job.jobTitle || "Vaga sem título"}</CardTitle>
                <CardDescription>
                  {a.job.company || "Empresa não informada"} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-muted-foreground">Cobertura de palavras-chave da vaga por versão (%)</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis domain={[0, 100]} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="cobertura" name="Cobertura" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/resultado/$id" params={{ id: a.id }}>Abrir análise</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
