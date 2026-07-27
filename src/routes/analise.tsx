import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Eraser,
  FileText,
  Link2,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzeMatch, fetchJobFromUrl } from "@/lib/ai.functions";
import { extractTextFromFile, validateFile, sanitizeText } from "@/lib/extract";
import { SAMPLE_JOB, SAMPLE_RESUME } from "@/lib/sample";
import {
  clearDraft,
  emptyDraft,
  getSessionId,
  loadDraft,
  newId,
  saveAnalysis,
  saveDraft,
  type DraftState,
} from "@/lib/storage";
import type { AnalysisRecord } from "@/lib/types";

export const Route = createFileRoute("/analise")({
  head: () => ({
    meta: [
      { title: "Nova análise de vaga | MatchCV" },
      {
        name: "description",
        content:
          "Cole a descrição da vaga, envie seu currículo e receba a análise de compatibilidade com palavras-chave e lacunas.",
      },
      { property: "og:title", content: "Nova análise de vaga | MatchCV" },
      {
        property: "og:description",
        content: "Compare vaga e currículo em poucos minutos, sem cadastro.",
      },
    ],
  }),
  component: AnalysisWizard,
});

const PROCESSING_MESSAGES = [
  "Lendo a descrição da vaga.",
  "Identificando requisitos.",
  "Estruturando o currículo.",
  "Comparando experiências e competências.",
  "Calculando compatibilidade.",
  "Preparando recomendações.",
];

const STEP_LABELS = ["Vaga", "Currículo", "Análise"];

function guessField(text: string, patterns: RegExp[]) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim().slice(0, 120);
  }
  return "";
}

function autofillJobFields(text: string): Partial<DraftState["jobFields"]> {
  const lower = text.toLowerCase();
  const workModel = lower.includes("remoto")
    ? "remoto"
    : lower.includes("híbrid") || lower.includes("hibrid")
      ? "hibrido"
      : lower.includes("presencial")
        ? "presencial"
        : "nao_identificado";
  const seniority = ["estágio", "júnior", "junior", "pleno", "sênior", "senior", "especialista", "coordenação", "gerência"].find(
    (s) => lower.includes(s),
  );
  const firstLine = text.trim().split("\n")[0]?.slice(0, 120) ?? "";
  return {
    jobTitle: firstLine.replace(/^vaga:?\s*/i, ""),
    company: guessField(text, [/empresa:\s*(.+)/i, /—\s*Empresa[^:]*:\s*(.+)/i]),
    location: guessField(text, [/local(?:ização)?:\s*(.+)/i, /cidade:\s*(.+)/i]),
    workModel,
    seniority: seniority ? seniority[0].toUpperCase() + seniority.slice(1) : "",
    area: guessField(text, [/área:\s*(.+)/i]),
  };
}

function AnalysisWizard() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [restored, setRestored] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(
    null,
  );
  const [fileStatus, setFileStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runAnalyze = useServerFn(analyzeMatch);
  const runFetchUrl = useServerFn(fetchJobFromUrl);

  useEffect(() => {
    const stored = loadDraft();
    setDraft(stored);
    if (stored.jobText || stored.resumeText) setRestored(true);
  }, []);

  const update = (patch: Partial<DraftState>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(next);
      return next;
    });
  };

  const updateField = (key: keyof DraftState["jobFields"], value: string) =>
    update({ jobFields: { ...draft.jobFields, [key]: value } });

  /* ------------------------------ Etapa 1 ------------------------------ */

  const handleJobText = (value: string) => {
    const patch: Partial<DraftState> = { jobText: value };
    if (value.length > 120 && !draft.jobFields.jobTitle) {
      patch.jobFields = { ...draft.jobFields, ...autofillJobFields(value) } as DraftState["jobFields"];
    }
    update(patch);
  };

  const handleFetchUrl = async () => {
    if (!draft.jobUrl.trim()) {
      toast.error("Informe o link da vaga.");
      return;
    }
    setLoadingUrl(true);
    try {
      const res = await runFetchUrl({ data: { url: draft.jobUrl.trim() } });
      if (res.ok && res.text) {
        handleJobText(res.text);
        toast.success("Conteúdo da vaga importado. Revise antes de continuar.");
      } else {
        toast.error(
          "Não conseguimos acessar automaticamente essa página. Copie e cole a descrição da vaga para continuar.",
        );
      }
    } catch {
      toast.error(
        "Não conseguimos acessar automaticamente essa página. Copie e cole a descrição da vaga para continuar.",
      );
    } finally {
      setLoadingUrl(false);
    }
  };

  const loadSample = () => {
    const patch = autofillJobFields(SAMPLE_JOB);
    update({
      jobText: SAMPLE_JOB,
      jobFields: {
        ...draft.jobFields,
        ...patch,
        jobTitle: "Analista de Dados Pleno",
        company: "Aurora Tech (exemplo fictício)",
        location: "São Paulo/SP",
        workModel: "hibrido",
        seniority: "Pleno",
        area: "Dados e Analytics",
      } as DraftState["jobFields"],
      resumeText: SAMPLE_RESUME,
      resumeFileName: "curriculo_exemplo.txt",
    });
    setFileInfo(null);
    setFileStatus("done");
    toast.success("Exemplo carregado", {
      description: "Vaga e currículo fictícios prontos para análise.",
    });
  };

  const goToResume = () => {
    if (draft.jobText.trim().length < 120) {
      toast.error("A descrição da vaga está muito curta.", {
        description: "Cole ao menos os requisitos e as responsabilidades para uma boa análise.",
      });
      return;
    }
    update({ step: 1 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ------------------------------ Etapa 2 ------------------------------ */

  const handleFile = async (file: File) => {
    const problem = validateFile(file);
    if (problem) {
      setFileStatus("error");
      toast.error(problem);
      return;
    }
    setFileInfo({ name: file.name, size: file.size, type: file.type || "desconhecido" });
    setFileStatus("processing");
    try {
      const text = await extractTextFromFile(file);
      if (text.trim().length < 80) {
        setFileStatus("error");
        toast.error("Não encontramos texto neste arquivo.", {
          description: "Se o PDF for digitalizado, copie e cole o conteúdo manualmente.",
        });
        return;
      }
      update({ resumeText: text, resumeFileName: file.name });
      setFileStatus("done");
      toast.success("Currículo processado. Revise o texto abaixo.");
    } catch {
      setFileStatus("error");
      toast.error("Não foi possível ler o arquivo. Tente outro formato ou cole o texto.");
    }
  };

  const removeFile = () => {
    setFileInfo(null);
    setFileStatus("idle");
    update({ resumeText: "", resumeFileName: "" });
  };

  /* ------------------------------ Etapa 3 ------------------------------ */

  const startAnalysis = async () => {
    if (draft.resumeText.trim().length < 120) {
      toast.error("O currículo está muito curto para análise.");
      return;
    }
    if (!draft.consent) {
      toast.error("É necessário confirmar a autorização de processamento.");
      return;
    }

    setError(null);
    setProcessing(true);
    update({ step: 2 });
    setProgress(6);
    setMessageIndex(0);

    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 6, 92));
      setMessageIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
    }, 2600);

    try {
      const result = await runAnalyze({
        data: {
          jobText: sanitizeText(draft.jobText),
          jobUrl: draft.jobUrl,
          resumeText: sanitizeText(draft.resumeText),
        },
      });

      const sessionId = getSessionId();
      const now = new Date().toISOString();
      const jobId = newId();
      const resumeId = newId();
      const record: AnalysisRecord = {
        id: newId(),
        sessionId,
        createdAt: now,
        job: {
          ...result.job,
          jobTitle: draft.jobFields.jobTitle || result.job.jobTitle,
          company: draft.jobFields.company || result.job.company,
          location: draft.jobFields.location || result.job.location,
          seniority: draft.jobFields.seniority || result.job.seniority,
          area: draft.jobFields.area || result.job.area,
          workModel: (draft.jobFields.workModel ||
            result.job.workModel) as typeof result.job.workModel,
          id: jobId,
          sessionId,
          createdAt: now,
          updatedAt: now,
          sourceUrl: draft.jobUrl,
          rawDescription: draft.jobText,
          normalizedDescription: sanitizeText(draft.jobText),
        },
        resume: {
          id: resumeId,
          sessionId,
          createdAt: now,
          updatedAt: now,
          sourceFileName: draft.resumeFileName || "texto colado",
          rawText: draft.resumeText,
          content: result.resume,
        },
        match: {
          ...result.match,
          id: newId(),
          sessionId,
          jobId,
          resumeId,
          generatedAt: now,
        },
        versions: [
          {
            id: newId(),
            sessionId,
            jobId,
            originalResumeId: resumeId,
            name: "Currículo original",
            status: "original",
            content: result.resume,
            createdAt: now,
            updatedAt: now,
            isOriginal: true,
            isTailored: false,
          },
        ],
        confirmedExperiences: [],
      };

      saveAnalysis(record);
      setProgress(100);
      clearDraft();
      clearInterval(timer);
      navigate({ to: "/resultado/$id", params: { id: record.id } });
    } catch (e) {
      clearInterval(timer);
      setProcessing(false);
      setError(e instanceof Error ? e.message : "Falha inesperada ao gerar a análise.");
    }
  };

  /* -------------------------------- UI -------------------------------- */

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <ol className="mb-8 flex items-center gap-2" aria-label="Etapas da análise">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                i <= draft.step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              aria-current={i === draft.step ? "step" : undefined}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm font-medium ${i === draft.step ? "" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 ? (
              <span className="hidden h-px flex-1 bg-border sm:block" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>

      {restored && draft.step < 2 ? (
        <Alert className="mb-6">
          <AlertTitle>Sessão restaurada</AlertTitle>
          <AlertDescription>
            Recuperamos o que você já havia preenchido neste navegador.
          </AlertDescription>
        </Alert>
      ) : null}

      {draft.step === 0 ? (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Qual vaga você deseja analisar?</CardTitle>
            <CardDescription>
              Cole a descrição completa ou tente importar a partir do link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="texto">
              <TabsList>
                <TabsTrigger value="texto">
                  <FileText className="size-4" aria-hidden="true" />
                  Colar descrição
                </TabsTrigger>
                <TabsTrigger value="link">
                  <Link2 className="size-4" aria-hidden="true" />
                  Inserir link
                </TabsTrigger>
              </TabsList>
              <TabsContent value="texto" className="mt-4">
                <Label htmlFor="job-text">Descrição da vaga</Label>
                <Textarea
                  id="job-text"
                  value={draft.jobText}
                  onChange={(e) => handleJobText(e.target.value)}
                  placeholder="Cole aqui o título, responsabilidades, requisitos e demais informações da vaga."
                  className="mt-2 min-h-64"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {draft.jobText.trim().length} caracteres — recomendamos ao menos 120.
                </p>
              </TabsContent>
              <TabsContent value="link" className="mt-4 space-y-3">
                <Label htmlFor="job-url">Link da vaga</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="job-url"
                    type="url"
                    inputMode="url"
                    value={draft.jobUrl}
                    onChange={(e) => update({ jobUrl: e.target.value })}
                    placeholder="https://empresa.com/vagas/analista"
                  />
                  <Button onClick={handleFetchUrl} disabled={loadingUrl}>
                    {loadingUrl ? <Loader2 className="size-4 animate-spin" /> : null}
                    Importar conteúdo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Muitos sites bloqueiam leitura automática. Se isso acontecer, copie e cole a
                  descrição na outra aba.
                </p>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="f-title">Título da vaga</Label>
                <Input
                  id="f-title"
                  className="mt-2"
                  value={draft.jobFields.jobTitle}
                  onChange={(e) => updateField("jobTitle", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="f-company">Empresa</Label>
                <Input
                  id="f-company"
                  className="mt-2"
                  value={draft.jobFields.company}
                  onChange={(e) => updateField("company", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="f-location">Local</Label>
                <Input
                  id="f-location"
                  className="mt-2"
                  value={draft.jobFields.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="f-model">Modalidade</Label>
                <Select
                  value={draft.jobFields.workModel}
                  onValueChange={(v) => updateField("workModel", v)}
                >
                  <SelectTrigger id="f-model" className="mt-2 w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                    <SelectItem value="remoto">Remoto</SelectItem>
                    <SelectItem value="nao_identificado">Não identificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="f-seniority">Senioridade</Label>
                <Input
                  id="f-seniority"
                  className="mt-2"
                  value={draft.jobFields.seniority}
                  onChange={(e) => updateField("seniority", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="f-area">Área profissional</Label>
                <Input
                  id="f-area"
                  className="mt-2"
                  value={draft.jobFields.area}
                  onChange={(e) => updateField("area", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="f-link">Link original</Label>
                <Input
                  id="f-link"
                  className="mt-2"
                  value={draft.jobUrl}
                  onChange={(e) => update({ jobUrl: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-lang">Idioma da vaga</Label>
                <Select
                  value={draft.jobFields.language}
                  onValueChange={(v) => updateField("language", v)}
                >
                  <SelectTrigger id="f-lang" className="mt-2 w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português</SelectItem>
                    <SelectItem value="en">Inglês</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={goToResume}>
                Continuar
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  update({ ...emptyDraft, step: 0 });
                  toast.success("Campos da vaga limpos.");
                }}
              >
                <Eraser className="size-4" aria-hidden="true" />
                Limpar
              </Button>
              <Button variant="secondary" onClick={loadSample}>
                Usar vaga de exemplo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {draft.step === 1 ? (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Agora adicione seu currículo atual.</CardTitle>
            <CardDescription>
              Aceitamos PDF, DOCX e TXT com até 10 MB, ou o texto colado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? "border-primary bg-accent" : "border-border"
              }`}
            >
              <Upload className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-semibold">Arraste seu arquivo aqui</p>
              <p className="text-sm text-muted-foreground">PDF, DOCX ou TXT até 10 MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="sr-only"
                aria-label="Selecionar arquivo do currículo"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()}>
                Selecionar arquivo
              </Button>
            </div>

            {fileInfo ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-secondary p-3 text-sm">
                <FileText className="size-4" aria-hidden="true" />
                <span className="font-medium">{fileInfo.name}</span>
                <Badge variant="outline">{fileInfo.name.split(".").pop()?.toUpperCase()}</Badge>
                <span className="text-muted-foreground">
                  {(fileInfo.size / 1024).toFixed(0)} KB
                </span>
                <Badge
                  variant={
                    fileStatus === "done"
                      ? "default"
                      : fileStatus === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {fileStatus === "processing"
                    ? "Processando"
                    : fileStatus === "done"
                      ? "Texto extraído"
                      : fileStatus === "error"
                        ? "Falha na leitura"
                        : "Aguardando"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  aria-label="Remover arquivo"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : null}

            {fileStatus === "processing" ? <Skeleton className="h-24 w-full" /> : null}

            <div>
              <Label htmlFor="resume-text">Texto do currículo (revise e corrija se necessário)</Label>
              <Textarea
                id="resume-text"
                value={draft.resumeText}
                onChange={(e) => update({ resumeText: e.target.value })}
                placeholder="Cole aqui o conteúdo do seu currículo."
                className="mt-2 min-h-72"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Nunca preenchemos informações que você não tenha fornecido. O que não for
                identificado ficará marcado como “Informação não identificada”.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-highlight-soft p-4">
              <Checkbox
                id="consent"
                checked={draft.consent}
                onCheckedChange={(v) => update({ consent: v === true })}
                aria-describedby="consent-desc"
              />
              <Label htmlFor="consent" id="consent-desc" className="text-sm leading-relaxed">
                Confirmo que revisei as informações e autorizo o processamento temporário deste
                currículo para gerar a análise.
              </Label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => update({ step: 0 })}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar
              </Button>
              <Button onClick={startAnalysis} disabled={!draft.consent}>
                Analisar compatibilidade
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {draft.step === 2 ? (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">
              {processing ? "Analisando sua compatibilidade" : "Não foi possível concluir"}
            </CardTitle>
            <CardDescription>
              {processing
                ? "Isso costuma levar de 30 a 90 segundos. Não feche esta página."
                : "Revise as informações e tente novamente."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {processing ? (
              <>
                <Progress value={progress} aria-label="Progresso da análise" />
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {PROCESSING_MESSAGES[messageIndex]}
                </p>
                <ol className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  {PROCESSING_MESSAGES.map((m, i) => (
                    <li key={m} className={i === messageIndex ? "font-semibold text-foreground" : ""}>
                      {i + 1}. {m}
                    </li>
                  ))}
                </ol>
                <div className="space-y-3">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </>
            ) : (
              <>
                <Alert variant="destructive">
                  <AlertTitle>A análise falhou</AlertTitle>
                  <AlertDescription>
                    {error ?? "Ocorreu um erro ao processar as informações."}
                  </AlertDescription>
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={startAnalysis}>Tentar novamente</Button>
                  <Button variant="outline" onClick={() => update({ step: 1 })}>
                    Editar informações
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(error ?? "erro desconhecido");
                      toast.success("Detalhes técnicos copiados.");
                    }}
                  >
                    Copiar detalhes técnicos
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
