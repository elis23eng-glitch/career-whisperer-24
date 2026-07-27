import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ResumeEditor } from "@/components/resume/ResumeEditor";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { generateTailoredResume } from "@/lib/ai.functions";
import { exportDocx, exportPdf, exportTxt, resumeToPlainText } from "@/lib/resume-export";
import { newId } from "@/lib/storage";
import type { AnalysisRecord, ResumeContent, ResumeVersion } from "@/lib/types";

export function AtsResumeTab({
  record,
  onUpdate,
}: {
  record: AnalysisRecord;
  onUpdate: (next: AnalysisRecord) => void;
}) {
  const runGenerate = useServerFn(generateTailoredResume);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState(
    record.versions.find((v) => v.isTailored)?.id ?? record.versions[0]?.id ?? "",
  );
  const [history, setHistory] = useState<ResumeContent[]>([]);
  const [future, setFuture] = useState<ResumeContent[]>([]);

  const active = record.versions.find((v) => v.id === activeId) ?? record.versions[0];
  const hasTailored = record.versions.some((v) => v.isTailored);

  const atsChecklist = record.match.atsChecklist;
  const atsScore = record.match.atsScore;

  const plainText = useMemo(
    () => (active ? resumeToPlainText(active.content) : ""),
    [active],
  );

  const updateVersion = (content: ResumeContent, markEdited = true) => {
    if (!active) return;
    setHistory((h) => [...h.slice(-24), active.content]);
    setFuture([]);
    const versions = record.versions.map((v) =>
      v.id === active.id
        ? {
            ...v,
            content,
            status: markEdited && !v.isOriginal ? ("editada" as const) : v.status,
            updatedAt: new Date().toISOString(),
          }
        : v,
    );
    onUpdate({ ...record, versions });
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const content = await runGenerate({
        data: {
          jobText: record.job.normalizedDescription || record.job.rawDescription,
          jobExtraction: record.job,
          resumeContent: record.resume.content,
          resumeRawText: record.resume.rawText,
          confirmedExperiences: record.confirmedExperiences,
        },
      });
      const now = new Date().toISOString();
      const version: ResumeVersion = {
        id: newId(),
        sessionId: record.sessionId,
        jobId: record.job.id,
        originalResumeId: record.resume.id,
        name: `Versão direcionada — ${record.job.jobTitle || "vaga"}`,
        status: "direcionada",
        content,
        createdAt: now,
        updatedAt: now,
        isOriginal: false,
        isTailored: true,
      };
      onUpdate({ ...record, versions: [...record.versions, version] });
      setActiveId(version.id);
      toast.success("Currículo direcionado gerado. Revise antes de exportar.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar o currículo.");
    } finally {
      setGenerating(false);
    }
  };

  if (!active) return null;

  const editorPanel = (
    <div className="space-y-4 pr-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={active.isTailored ? "default" : "secondary"}>
          {active.isOriginal
            ? "Conteúdo confirmado pelo usuário"
            : "Sugestão de redação gerada por IA"}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          disabled={history.length === 0}
          onClick={() => {
            const prev = history[history.length - 1];
            if (!prev) return;
            setHistory((h) => h.slice(0, -1));
            setFuture((f) => [active.content, ...f]);
            onUpdate({
              ...record,
              versions: record.versions.map((v) =>
                v.id === active.id ? { ...v, content: prev } : v,
              ),
            });
          }}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Desfazer
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={future.length === 0}
          onClick={() => {
            const next = future[0];
            if (!next) return;
            setFuture((f) => f.slice(1));
            setHistory((h) => [...h, active.content]);
            onUpdate({
              ...record,
              versions: record.versions.map((v) =>
                v.id === active.id ? { ...v, content: next } : v,
              ),
            });
          }}
        >
          <RotateCw className="size-4" aria-hidden="true" />
          Refazer
        </Button>
      </div>
      <ResumeEditor
        content={active.content}
        onChange={updateVersion}
        jobTitle={record.job.jobTitle}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {!hasTailored ? (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Gerar currículo ATS direcionado</CardTitle>
            <CardDescription>
              Usaremos apenas o que existe no seu currículo original e o que você confirmou na aba
              Palavras-chave.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {generating ? (
              <>
                <Progress value={70} aria-label="Gerando currículo" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível gerar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button onClick={generate} disabled={generating}>
              {generating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
              Gerar versão direcionada
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={activeId} onValueChange={setActiveId}>
          <SelectTrigger className="w-full sm:w-80" aria-label="Selecionar versão do currículo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {record.versions.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date().toISOString();
            const copy: ResumeVersion = {
              ...active,
              id: newId(),
              name: `${active.name} (cópia)`,
              status: "editada",
              isOriginal: false,
              createdAt: now,
              updatedAt: now,
            };
            onUpdate({ ...record, versions: [...record.versions, copy] });
            setActiveId(copy.id);
            toast.success("Versão duplicada.");
          }}
        >
          Duplicar versão
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const name = window.prompt("Novo nome da versão", active.name);
            if (!name?.trim()) return;
            onUpdate({
              ...record,
              versions: record.versions.map((v) =>
                v.id === active.id ? { ...v, name: name.trim() } : v,
              ),
            });
          }}
        >
          Renomear
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={record.versions.length <= 1 || active.isOriginal}
          onClick={() => {
            const versions = record.versions.filter((v) => v.id !== active.id);
            onUpdate({ ...record, versions });
            setActiveId(versions[0].id);
            toast.success("Versão excluída.");
          }}
        >
          Excluir versão
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void exportPdf(active.content, record.job.jobTitle)}>
          <Download className="size-4" aria-hidden="true" />
          Exportar PDF
        </Button>
        <Button variant="outline" onClick={() => void exportDocx(active.content, record.job.jobTitle)}>
          <FileText className="size-4" aria-hidden="true" />
          Exportar DOCX
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(plainText);
            toast.success("Texto do currículo copiado.");
          }}
        >
          <Copy className="size-4" aria-hidden="true" />
          Copiar texto
        </Button>
        <Button variant="outline" onClick={() => exportTxt(active.content, record.job.jobTitle)}>
          Baixar TXT
        </Button>
        <Button variant="ghost" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          Imprimir
        </Button>
      </div>

      <div className="hidden lg:block">
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-xl border">
          <ResizablePanel defaultSize={48} minSize={30} className="p-4">
            <div className="h-[70vh] overflow-y-auto">{editorPanel}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={52} minSize={30} className="bg-secondary/40 p-4">
            <div className="h-[70vh] overflow-y-auto">
              <ResumePreview content={active.content} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="lg:hidden">
        <Tabs defaultValue="editar">
          <TabsList className="w-full">
            <TabsTrigger value="editar" className="flex-1">
              Editar
            </TabsTrigger>
            <TabsTrigger value="visualizar" className="flex-1">
              Visualizar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="editar" className="mt-4">
            {editorPanel}
          </TabsContent>
          <TabsContent value="visualizar" className="mt-4">
            <ResumePreview content={active.content} />
          </TabsContent>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validador ATS</CardTitle>
          <CardDescription>
            Pontuação ATS: <strong>{atsScore}/100</strong>. Ela é independente do índice de
            compatibilidade e não garante aprovação em todos os sistemas de recrutamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {atsChecklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <Badge
                  className={
                    item.status === "ok"
                      ? "bg-success text-success-foreground"
                      : item.status === "atencao"
                        ? "bg-highlight text-highlight-foreground"
                        : "bg-destructive text-destructive-foreground"
                  }
                >
                  {item.status === "ok" ? "OK" : item.status === "atencao" ? "Atenção" : "Falha"}
                </Badge>
                <span>
                  <strong>{item.item}</strong>
                  {item.note ? <span className="block text-muted-foreground">{item.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
