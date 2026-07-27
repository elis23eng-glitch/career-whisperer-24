import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScoreRing } from "@/components/ScoreRing";
import { deleteAnalysis, listAnalyses, subscribeStorage } from "@/lib/storage";
import { downloadJson, exportDocx, exportPdf } from "@/lib/resume-export";
import type { AnalysisRecord } from "@/lib/types";

export const Route = createFileRoute("/curriculos")({
  head: () => ({
    meta: [
      { title: "Meus currículos e análises | MatchCV" },
      {
        name: "description",
        content:
          "Acesse as análises salvas neste dispositivo, exporte currículos em PDF ou DOCX e faça backup dos seus dados.",
      },
      { property: "og:title", content: "Meus currículos e análises | MatchCV" },
      {
        property: "og:description",
        content: "Histórico local de análises com exportação em PDF e DOCX.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function bestVersion(record: AnalysisRecord) {
  return record.versions.find((v) => v.isTailored) ?? record.versions[0];
}

function LibraryPage() {
  const [items, setItems] = useState<AnalysisRecord[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setItems(listAnalyses());
    refresh();
    const unsubscribe = subscribeStorage(refresh);
    return () => {
      unsubscribe();
    };
  }, []);

  const filtered = items.filter((r) =>
    [r.job.jobTitle, r.job.company, r.resume.content.fullName]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Meus currículos</h1>
          <p className="mt-2 text-muted-foreground">
            Tudo fica salvo apenas neste navegador. Faça backup se quiser levar para outro
            dispositivo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/analise">Nova análise</Link>
          </Button>
          <Button
            variant="outline"
            disabled={items.length === 0}
            onClick={() => {
              downloadJson(
                {
                  app: "matchcv",
                  version: 1,
                  exportedAt: new Date().toISOString(),
                  analyses: items,
                },
                "matchcv_backup.json",
              );
              toast.success("Backup exportado.");
            }}
          >
            <FileDown className="size-4" aria-hidden="true" />
            Backup (JSON)
          </Button>
        </div>
      </div>

      <Input
        className="mt-6"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por vaga, empresa ou nome"
        aria-label="Buscar análises salvas"
      />

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-semibold">Nenhuma análise encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Faça sua primeira análise para começar seu histórico.
          </p>
          <Button asChild className="mt-4">
            <Link to="/analise">Analisar uma vaga</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {filtered.map((record) => {
            const version = bestVersion(record);
            return (
              <Card key={record.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">
                      {record.job.jobTitle || "Vaga sem título"}
                    </CardTitle>
                    <CardDescription>
                      {[record.job.company, record.job.location].filter(Boolean).join(" • ") ||
                        "Empresa não identificada"}{" "}
                      — {new Date(record.createdAt).toLocaleDateString("pt-BR")}
                    </CardDescription>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {record.versions.length} versão(ões)
                      </Badge>
                      <Badge variant="outline">
                        {record.confirmedExperiences.length} evidência(s) confirmada(s)
                      </Badge>
                    </div>
                  </div>
                  <ScoreRing score={record.match.overallScore} size={82} />
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to="/resultado/$id" params={{ id: record.id }}>
                      Abrir análise
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!version}
                    onClick={() => {
                      if (!version) return;
                      void exportPdf(version.content, record.job.jobTitle);
                    }}
                  >
                    Exportar PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!version}
                    onClick={() => {
                      if (!version) return;
                      void exportDocx(version.content, record.job.jobTitle);
                    }}
                  >
                    Exportar DOCX
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteAnalysis(record.id);
                      toast.success("Análise excluída.");
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Excluir
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
