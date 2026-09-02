import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Info, Loader2, Mic, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { newId } from "@/lib/storage";
import {
  listJobs,
  listResumes,
  getPrimaryResume,
  saveInterview,
  subscribeInterviewStore,
  syncFromAnalyses,
} from "@/lib/interview/store";
import { startInterview } from "@/lib/interview/interview.functions";
import {
  isRecognitionSupported,
  requestMicPermission,
  type MicPermission,
} from "@/lib/voice/recognition";
import { speak, stopSpeaking, warmUpVoices } from "@/lib/voice/speech";
import {
  ANSWER_MODE_LABELS,
  DIFFICULTY_LABELS,
  INTERVIEW_TYPE_LABELS,
  LANGUAGE_LABELS,
  type AnswerMode,
  type Difficulty,
  type FeedbackMode,
  type InterviewConfig,
  type InterviewLanguage,
  type InterviewSession,
  type InterviewType,
  type SavedJob,
  type SavedResume,
} from "@/lib/interview/schemas";

interface InterviewSearch {
  vaga?: string;
  curriculo?: string;
  fracas?: boolean;
  tipo?: string;
  modo?: string;
  idioma?: string;
}

export const Route = createFileRoute("/entrevista/nova")({
  validateSearch: (search: Record<string, unknown>): InterviewSearch => {
    const out: InterviewSearch = {};
    if (typeof search["vaga"] === "string") out.vaga = search["vaga"];
    if (typeof search["curriculo"] === "string") out.curriculo = search["curriculo"];
    if (search["fracas"] === true || search["fracas"] === "true") out.fracas = true;
    if (typeof search["tipo"] === "string") out.tipo = search["tipo"];
    if (typeof search["modo"] === "string") out.modo = search["modo"];
    if (typeof search["idioma"] === "string") out.idioma = search["idioma"];
    return out;
  },

  head: () => ({
    meta: [
      { title: "Preparar entrevista simulada | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Escolha a vaga, o currículo, o tipo de entrevista e o nível de dificuldade para treinar com o Agente Recrutador de IA.",
      },
      { property: "og:title", content: "Preparar entrevista simulada | MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Configure sua simulação de entrevista personalizada em poucos cliques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewInterviewPage,
});

const TYPES: { value: InterviewType; description: string }[] = [
  { value: "completa", description: "RH, comportamental, técnica e gestor — a mais recomendada." },
  { value: "rh", description: "Trajetória, motivação, expectativas e alinhamento com a vaga." },
  { value: "comportamental", description: "Situações reais que você já viveu, no método STAR." },
  { value: "tecnica", description: "Conhecimentos e ferramentas realmente pedidos na vaga." },
  { value: "gestor", description: "Entregas, prioridades e resolução de problemas do dia a dia." },
];

function NewInterviewPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [jobId, setJobId] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [type, setType] = useState<InterviewType>((search.tipo as InterviewType) ?? "completa");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediario");
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(5);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>("imediato");
  const [answerMode, setAnswerMode] = useState<AnswerMode>(
    search.modo === "voz" ? "voz" : search.modo === "texto" ? "texto" : "hibrido",
  );
  const [language, setLanguage] = useState<InterviewLanguage>(
    search.idioma === "en-US" ? "en-US" : "pt-BR",
  );
  const [micPermission, setMicPermission] = useState<MicPermission>("desconhecida");
  const [testingMic, setTestingMic] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    warmUpVoices();
    setVoiceSupported(isRecognitionSupported());
    return () => stopSpeaking();
  }, []);

  const testMic = async () => {
    setTestingMic(true);
    const result = await requestMicPermission();
    setMicPermission(result);
    setTestingMic(false);
    if (result === "permitida") toast.success("Microfone autorizado. Tudo pronto para falar.");
    if (result === "negada")
      toast.error("O microfone não foi autorizado. Você pode responder digitando.");
    if (result === "indisponivel")
      toast.error("Não encontramos um microfone neste aparelho. Você pode responder digitando.");
  };

  const previewVoice = () => {
    setSpeaking(true);
    speak(
      language === "en-US"
        ? "Hi! I am your interview coach. I will ask one question at a time."
        : "Olá! Eu sou o seu recrutador nesta simulação. Vou fazer uma pergunta de cada vez.",
      { lang: language, onEnd: () => setSpeaking(false) },
    );
  };


  useEffect(() => {
    syncFromAnalyses();
    const refresh = () => {
      const j = listJobs();
      const r = listResumes();
      setJobs(j);
      setResumes(r);
      setJobId((prev) => prev || search.vaga || j[0]?.id || "");
      setResumeId((prev) => prev || search.curriculo || getPrimaryResume()?.id || "");
    };
    refresh();
    return subscribeInterviewStore(refresh);
  }, [search.vaga, search.curriculo]);

  const job = useMemo(() => jobs.find((j) => j.id === jobId), [jobs, jobId]);
  const resume = useMemo(() => resumes.find((r) => r.id === resumeId), [resumes, resumeId]);

  const begin = async () => {
    if (!job || !resume) {
      toast.error("Escolha uma vaga e um currículo para começar.");
      return;
    }
    stopSpeaking();
    const usesVoice = answerMode !== "texto";
    if (usesVoice && voiceSupported && micPermission === "desconhecida") {
      const result = await requestMicPermission();
      setMicPermission(result);
    }
    setStarting(true);
    const config: InterviewConfig = {
      type,
      difficulty,
      questionCount,
      feedbackMode,
      answerMode: voiceSupported ? answerMode : "texto",
      language,
    };

    try {
      const opening = await startInterview({
        data: {
          jobTitle: job.title,
          company: job.company,
          seniority: job.seniority,
          jobDescription: job.description,
          resumeText: resume.rawText,
          config,
        },
      });
      const session: InterviewSession = {
        id: newId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        jobId: job.id,
        resumeId: resume.id,
        jobTitle: job.title,
        company: job.company,
        config,
        intro: opening.intro,
        turns: [{ index: 0, question: opening.question, answer: "", attempts: 0 }],
        status: "em_andamento",
      };
      saveInterview(session);
      router.navigate({ to: "/entrevista/$id", params: { id: session.id } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível iniciar a entrevista agora.",
      );
    } finally {
      setStarting(false);
    }
  };

  const missingData = jobs.length === 0 || resumes.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Preparar sua entrevista</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Escolha como quer treinar. O Agente Recrutador vai criar perguntas com base na vaga e no
          seu currículo, uma de cada vez, no seu ritmo.
        </p>
      </header>

      <Alert className="mb-6">
        <Info className="size-4" aria-hidden="true" />
        <AlertTitle>Simulação com inteligência artificial</AlertTitle>
        <AlertDescription>
          As perguntas, o feedback e o relatório são gerados por IA com finalidade educativa. Não
          substituem a avaliação de uma empresa real e não garantem aprovação.
        </AlertDescription>
      </Alert>

      {missingData ? (
        <Card className="mb-6 border-warning">
          <CardHeader>
            <CardTitle className="text-lg">Faltam informações para começar</CardTitle>
            <CardDescription>
              Para uma simulação personalizada, precisamos de pelo menos uma vaga e um currículo
              salvos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {jobs.length === 0 ? (
              <Button asChild>
                <Link to="/vagas">Cadastrar uma vaga</Link>
              </Button>
            ) : null}
            {resumes.length === 0 ? (
              <Button asChild variant="outline">
                <Link to="/meu-curriculo">Adicionar meu currículo</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">1. Vaga e currículo</CardTitle>
            <CardDescription>São as informações que a IA vai usar na entrevista.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sel-job">Vaga da simulação</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger id="sel-job">
                  <SelectValue placeholder="Escolha uma vaga" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}
                      {j.company ? ` — ${j.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sel-resume">Currículo</Label>
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger id="sel-resume">
                  <SelectValue placeholder="Escolha um currículo" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.isPrimary ? " (principal)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">2. Tipo de entrevista</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={type}
              onValueChange={(value) => setType(value as InterviewType)}
              className="grid gap-3"
            >
              {TYPES.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`type-${option.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <RadioGroupItem
                    id={`type-${option.value}`}
                    value={option.value}
                    className="mt-1"
                  />
                  <span>
                    <span className="flex flex-wrap items-center gap-2 text-base font-semibold">
                      {INTERVIEW_TYPE_LABELS[option.value]}
                      {option.value === "completa" ? <Badge>Recomendada</Badge> : null}
                    </span>
                    <span className="mt-1 block text-sm font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">3. Nível, perguntas e feedback</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label>Nível de dificuldade</Label>
              <RadioGroup
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
                className="flex flex-wrap gap-3"
              >
                {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                  <Label
                    key={d}
                    htmlFor={`dif-${d}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-base has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <RadioGroupItem id={`dif-${d}`} value={d} />
                    {DIFFICULTY_LABELS[d]}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label>Quantidade de perguntas</Label>
              <RadioGroup
                value={String(questionCount)}
                onValueChange={(v) => setQuestionCount(Number(v) as 5 | 10 | 15)}
                className="flex flex-wrap gap-3"
              >
                {[5, 10, 15].map((n) => (
                  <Label
                    key={n}
                    htmlFor={`qtd-${n}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-base has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <RadioGroupItem id={`qtd-${n}`} value={String(n)} />
                    {n} perguntas
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label>Quando quer receber o feedback?</Label>
              <RadioGroup
                value={feedbackMode}
                onValueChange={(v) => setFeedbackMode(v as FeedbackMode)}
                className="flex flex-wrap gap-3"
              >
                <Label
                  htmlFor="fb-imediato"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-base has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <RadioGroupItem id="fb-imediato" value="imediato" />
                  Após cada resposta
                </Label>
                <Label
                  htmlFor="fb-final"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-base has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <RadioGroupItem id="fb-final" value="final" />
                  Somente no final
                </Label>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label>Modo de resposta</Label>
              <RadioGroup
                value={answerMode}
                onValueChange={(v) => setAnswerMode(v as AnswerMode)}
                className="grid gap-3"
              >
                {(["hibrido", "voz", "texto"] as AnswerMode[]).map((m) => (
                  <Label
                    key={m}
                    htmlFor={`modo-${m}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <RadioGroupItem id={`modo-${m}`} value={m} className="mt-1" />
                    <span>
                      <span className="flex flex-wrap items-center gap-2 text-base font-semibold">
                        {ANSWER_MODE_LABELS[m]}
                        {m === "hibrido" ? <Badge>Padrão</Badge> : null}
                      </span>
                      <span className="mt-1 block text-sm font-normal text-muted-foreground">
                        {m === "texto"
                          ? "Você escreve todas as respostas."
                          : m === "voz"
                            ? "O recrutador fala as perguntas e você responde falando."
                            : "O recrutador fala as perguntas e você escolhe falar ou digitar em cada resposta."}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
              {!voiceSupported ? (
                <Alert className="border-warning">
                  <Info className="size-4" aria-hidden="true" />
                  <AlertTitle>Voz indisponível neste navegador</AlertTitle>
                  <AlertDescription>
                    O recurso de voz não está disponível neste navegador. Você pode continuar a
                    entrevista digitando suas respostas.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Idioma da entrevista</Label>
              <RadioGroup
                value={language}
                onValueChange={(v) => setLanguage(v as InterviewLanguage)}
                className="flex flex-wrap gap-3"
              >
                {(["pt-BR", "en-US"] as InterviewLanguage[]).map((l) => (
                  <Label
                    key={l}
                    htmlFor={`idioma-${l}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-base has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <RadioGroupItem id={`idioma-${l}`} value={l} />
                    {LANGUAGE_LABELS[l]}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {answerMode !== "texto" && voiceSupported ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">4. Preparar o áudio</CardTitle>
              <CardDescription>
                Faça a entrevista em um local silencioso. A transcrição da sua fala aparece na tela e
                pode ser corrigida antes de enviar.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => void testMic()}
                  disabled={testingMic}
                >
                  {testingMic ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mic className="size-4" aria-hidden="true" />
                  )}
                  Testar microfone
                </Button>
                <Button type="button" size="lg" variant="outline" onClick={previewVoice}>
                  <Volume2 className="size-4" aria-hidden="true" />
                  {speaking ? "Reproduzindo…" : "Ouvir voz do recrutador"}
                </Button>
                <Badge
                  variant={micPermission === "permitida" ? "default" : "secondary"}
                  className="px-3 py-2 text-sm"
                >
                  {micPermission === "permitida"
                    ? "Microfone autorizado"
                    : micPermission === "negada"
                      ? "Microfone não autorizado"
                      : micPermission === "indisponivel"
                        ? "Microfone indisponível"
                        : "Permissão ainda não solicitada"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                O áudio é utilizado somente para gerar a transcrição. Por padrão, a gravação não é
                armazenada.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-primary/40 bg-accent/40">
          <CardHeader>
            <CardTitle className="text-xl">Resumo da simulação</CardTitle>
            <CardDescription>Confira antes de começar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-base">
            <p>
              <strong>Vaga:</strong> {job ? `${job.title}${job.company ? ` — ${job.company}` : ""}` : "não escolhida"}
            </p>
            <p>
              <strong>Currículo:</strong> {resume?.name ?? "não escolhido"}
            </p>
            <p>
              <strong>Tipo:</strong> {INTERVIEW_TYPE_LABELS[type]} • <strong>Nível:</strong>{" "}
              {DIFFICULTY_LABELS[difficulty]}
            </p>
            <p>
              <strong>Perguntas:</strong> {questionCount} •{" "}
              <strong>Feedback:</strong>{" "}
              {feedbackMode === "imediato" ? "após cada resposta" : "somente no final"}
            </p>
            <p>
              <strong>Modo:</strong> {ANSWER_MODE_LABELS[voiceSupported ? answerMode : "texto"]} •{" "}
              <strong>Idioma:</strong> {LANGUAGE_LABELS[language]}
            </p>
          </CardContent>
        </Card>


        <Button size="lg" className="h-14 text-base" onClick={begin} disabled={starting || !job || !resume}>
          {starting ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-5" aria-hidden="true" />
          )}
          {starting ? "Preparando sua entrevista…" : "Começar entrevista"}
        </Button>
      </div>
    </div>
  );
}
