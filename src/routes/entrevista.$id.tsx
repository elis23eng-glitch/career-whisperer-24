import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  Bot,
  CheckCircle2,
  Info,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { averageOf, getInterview, getJob, getResume, saveInterview } from "@/lib/interview/store";
import {
  buildInterviewReport,
  evaluateInterviewAnswer,
  nextInterviewQuestion,
} from "@/lib/interview/interview.functions";
import {
  INTERVIEW_TYPE_LABELS,
  LANGUAGE_LABELS,
  type AnswerEvaluation,
  type InterviewSession,
} from "@/lib/interview/schemas";
import { listInterviews } from "@/lib/interview/store";
import {
  VoiceRecognizer,
  isRecognitionSupported,
  requestMicPermission,
  type MicPermission,
} from "@/lib/voice/recognition";
import { isSpeechSynthesisSupported, speak, stopSpeaking, warmUpVoices } from "@/lib/voice/speech";

export const Route = createFileRoute("/entrevista/$id")({
  head: () => ({
    meta: [
      { title: "Sala de entrevista | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Responda às perguntas do Agente Recrutador por voz ou por texto e receba feedback claro sobre cada resposta.",
      },
      { property: "og:title", content: "Sala de entrevista | MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Entrevista simulada por voz ou texto, personalizada para a vaga escolhida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InterviewRoom,
});

type Phase =
  | "aguardando"
  | "reproduzindo"
  | "gravando"
  | "pausado"
  | "processando"
  | "transcricao";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function ScoreBar({ label, score, comment }: { label: string; score: number; comment: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span aria-label={`Nota ${score} de 5`}>{score}/5</span>
      </div>
      <Progress value={(score / 5) * 100} aria-hidden="true" />
      {comment ? <p className="text-sm text-muted-foreground">{comment}</p> : null}
    </div>
  );
}

function FeedbackCard({
  evaluation,
  onListen,
  listening,
  canListen,
}: {
  evaluation: AnswerEvaluation;
  onListen: () => void;
  listening: boolean;
  canListen: boolean;
}) {
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-lg">Feedback do recrutador</CardTitle>
        <CardDescription>
          Nota geral desta resposta: <strong>{evaluation.overall.toFixed(1)} de 5</strong>. Cada
          critério vem com uma explicação.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {canListen ? (
          <div>
            <Button type="button" variant="outline" size="lg" onClick={onListen}>
              {listening ? (
                <VolumeX className="size-4" aria-hidden="true" />
              ) : (
                <Volume2 className="size-4" aria-hidden="true" />
              )}
              {listening ? "Parar áudio do feedback" : "Ouvir resumo do feedback"}
            </Button>
          </div>
        ) : null}

        {evaluation.whatWorked.length ? (
          <section>
            <h3 className="mb-1 font-semibold">O que funcionou bem</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {evaluation.whatWorked.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {evaluation.toImprove.length ? (
          <section>
            <h3 className="mb-1 font-semibold">O que pode melhorar</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {evaluation.toImprove.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {evaluation.missing.length ? (
          <section>
            <h3 className="mb-1 font-semibold">Informações que ficaram faltando</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {evaluation.missing.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {evaluation.languageNotes.length ? (
          <section>
            <h3 className="mb-1 font-semibold">Sobre o inglês na sua resposta</h3>
            <p className="mb-1 text-sm text-muted-foreground">
              Avaliamos só a clareza e a compreensão — sotaque nunca é avaliado.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {evaluation.languageNotes.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {evaluation.relateToJob ? (
          <section>
            <h3 className="mb-1 font-semibold">Como conectar melhor com a vaga</h3>
            <p className="text-sm">{evaluation.relateToJob}</p>
          </section>
        ) : null}

        {evaluation.suggestedStructure ? (
          <section>
            <h3 className="mb-1 font-semibold">Estrutura sugerida</h3>
            <p className="text-sm whitespace-pre-line">{evaluation.suggestedStructure}</p>
          </section>
        ) : null}

        {evaluation.improvedExample ? (
          <section className="rounded-lg bg-muted p-4">
            <h3 className="mb-1 font-semibold">Exemplo melhorado com as suas informações</h3>
            <p className="text-sm whitespace-pre-line">{evaluation.improvedExample}</p>
          </section>
        ) : null}

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="lg">
              Ver exemplo de estrutura STAR
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid gap-2 rounded-lg border p-4 text-sm">
            <p>
              <strong>Situação:</strong>{" "}
              {evaluation.starGuide.situacao || "Explique o contexto e o problema que existia."}
            </p>
            <p>
              <strong>Tarefa:</strong>{" "}
              {evaluation.starGuide.tarefa || "Diga qual era a sua responsabilidade."}
            </p>
            <p>
              <strong>Ação:</strong>{" "}
              {evaluation.starGuide.acao || "Conte o que você fez, passo a passo."}
            </p>
            <p>
              <strong>Resultado:</strong>{" "}
              {evaluation.starGuide.resultado || "Mostre o que mudou ou o que você aprendeu."}
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section className="grid gap-3">
          <h3 className="font-semibold">Notas por critério</h3>
          {evaluation.criteria.map((c, i) => (
            <ScoreBar key={i} label={c.name} score={c.score} comment={c.comment} />
          ))}
        </section>
      </CardContent>
    </Card>
  );
}

function InterviewRoom() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [answer, setAnswer] = useState("");
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState<"" | "avaliando" | "proxima" | "relatorio">("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ------------------------------- estado de voz ------------------------------ */
  const [phase, setPhase] = useState<Phase>("aguardando");
  const [micPermission, setMicPermission] = useState<MicPermission>("desconhecida");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [typing, setTyping] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [repeats, setRepeats] = useState(0);
  const [volume, setVolume] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [caption, setCaption] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [feedbackPlaying, setFeedbackPlaying] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const spokenForRef = useRef<number | null>(null);

  useEffect(() => {
    setSession(getInterview(id) ?? null);
    setLoaded(true);
    warmUpVoices();
    setVoiceSupported(isRecognitionSupported());
    setTtsSupported(isSpeechSynthesisSupported());
  }, [id]);

  // Encerra áudio e captura ao sair da página.
  useEffect(() => {
    const cleanup = () => {
      recognizerRef.current?.dispose();
      recognizerRef.current = null;
      stopSpeaking();
    };
    window.addEventListener("pagehide", cleanup);
    return () => {
      window.removeEventListener("pagehide", cleanup);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (phase !== "gravando") return;
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [session?.turns.length, showFeedback, reduceMotion]);

  const current = useMemo(() => session?.turns[session.turns.length - 1], [session]);
  const answeredCount = useMemo(
    () => session?.turns.filter((t) => t.answer.trim().length > 0).length ?? 0,
    [session],
  );

  const language = session?.config.language ?? "pt-BR";
  const answerMode = session?.config.answerMode ?? "texto";
  const voiceEnabled = answerMode !== "texto" && voiceSupported;
  const speakEnabled = answerMode !== "texto" && ttsSupported;

  const speakText = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!speakEnabled || !text.trim()) {
        onEnd?.();
        return;
      }
      setPhase("reproduzindo");
      setCaption(text);
      speak(text, {
        lang: language,
        volume,
        onEnd: () => {
          setCaption("");
          setPhase((p) => (p === "reproduzindo" ? "aguardando" : p));
          onEnd?.();
        },
        onError: (m) => setVoiceMessage(m),
      });
    },
    [speakEnabled, language, volume],
  );

  // Lê a pergunta assim que ela aparece (o microfone só é liberado depois).
  useEffect(() => {
    if (!current || !speakEnabled || showFeedback) return;
    if (spokenForRef.current === current.index) return;
    spokenForRef.current = current.index;
    const intro = current.index === 0 && session?.intro ? `${session.intro}\n` : "";
    speakText(`${intro}${current.question.spoken || current.question.text}`);
  }, [current, speakEnabled, showFeedback, session?.intro, speakText]);

  const stopAudio = () => {
    stopSpeaking();
    setCaption("");
    setFeedbackPlaying(false);
    setPhase((p) => (p === "reproduzindo" ? "aguardando" : p));
  };

  const listenQuestion = (isRepeat: boolean) => {
    if (!current) return;
    if (isRepeat) setRepeats((r) => r + 1);
    stopSpeaking();
    speakText(current.question.spoken || current.question.text);
  };

  const startRecording = async (resume = false) => {
    if (!voiceEnabled || !current) return;
    if (recognizerRef.current?.running) return; // impede duas gravações simultâneas
    stopSpeaking();
    setVoiceMessage("");
    if (micPermission !== "permitida") {
      const result = await requestMicPermission();
      setMicPermission(result);
      if (result !== "permitida") {
        setVoiceMessage(
          result === "negada"
            ? "O microfone não está autorizado. Libere o acesso nas permissões do navegador ou responda digitando."
            : "Não encontramos um microfone disponível. Você pode responder digitando.",
        );
        return;
      }
    }
    if (!resume) {
      setElapsed(0);
      setDurationSec(0);
    }
    const recognizer = new VoiceRecognizer();
    recognizerRef.current = recognizer;
    recognizer.start(language, {
      onInterim: (text) => setInterim(text),
      onFinal: (text) => {
        setInterim("");
        setAnswer((prev) => (prev ? `${prev} ${text}` : text));
      },
      onError: (message, permission) => {
        setVoiceMessage(message);
        setMicPermission(permission);
      },
      onSilence: () =>
        setVoiceMessage(
          "Não ouvimos nada por alguns segundos. Continue falando, ou finalize a resposta quando quiser.",
        ),
      onEnd: () => {
        setInterim("");
      },
    });
    setPhase("gravando");
  };

  const pauseRecording = () => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setDurationSec((d) => d + elapsed);
    setPhase("pausado");
  };

  const finishRecording = () => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setDurationSec((d) => d + elapsed);
    setElapsed(0);
    setPhase("transcricao");
    setNeedsConfirm(true);
  };

  const discardRecording = () => {
    recognizerRef.current?.dispose();
    recognizerRef.current = null;
    setAnswer("");
    setInterim("");
    setElapsed(0);
    setDurationSec(0);
    setNeedsConfirm(false);
    setPhase("aguardando");
  };

  const persist = (next: InterviewSession) => {
    setSession(next);
    saveInterview(next);
  };

  const context = (s: InterviewSession) => {
    const job = getJob(s.jobId);
    const resume = getResume(s.resumeId);
    return {
      jobTitle: s.jobTitle,
      company: s.company,
      seniority: job?.seniority ?? "",
      jobDescription: job?.description ?? "",
      resumeText: resume?.rawText ?? "",
      config: s.config,
    };
  };

  const finish = async (s: InterviewSession) => {
    stopAudio();
    recognizerRef.current?.dispose();
    setBusy("relatorio");
    try {
      const previous = listInterviews()
        .filter((i) => i.id !== s.id && i.status === "concluida" && typeof i.averageScore === "number")
        .slice(0, 5)
        .map((i) => ({
          date: new Date(i.createdAt).toLocaleDateString("pt-BR"),
          jobTitle: i.jobTitle,
          average: i.averageScore ?? 0,
        }));

      const report = await buildInterviewReport({
        data: {
          ...context(s),
          turns: s.turns
            .filter((t) => t.answer.trim())
            .map((t) => ({
              question: t.question.text,
              answer: t.answer,
              ...(t.evaluation ? { overall: t.evaluation.overall } : {}),
              criteria: t.evaluation?.criteria.map((c) => ({ name: c.name, score: c.score })) ?? [],
              source: t.source ?? "texto",
              ...(typeof t.durationSec === "number" ? { durationSec: t.durationSec } : {}),
              ...(typeof t.repeats === "number" ? { repeats: t.repeats } : {}),
            })),
          previousSummaries: previous,
        },
      });
      const done: InterviewSession = {
        ...s,
        status: "concluida",
        report,
        ...(averageOf(s) !== undefined ? { averageScore: averageOf(s) } : {}),
      };
      persist(done);
      router.navigate({ to: "/entrevista/$id/relatorio", params: { id: s.id } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível gerar o relatório agora.",
      );
    } finally {
      setBusy("");
    }
  };

  const submitAnswer = async () => {
    if (!session || !current) return;
    if (answer.trim().length < 10) {
      toast.error("Escreva ou fale um pouco mais para o recrutador conseguir avaliar sua resposta.");
      return;
    }
    stopAudio();
    recognizerRef.current?.dispose();
    recognizerRef.current = null;
    const source: "voz" | "texto" = durationSec > 0 && !typing ? "voz" : "texto";
    setBusy("avaliando");
    try {
      const turns = [...session.turns];
      const last = {
        ...current,
        answer: answer.trim(),
        answeredAt: new Date().toISOString(),
        source,
        language: session.config.language,
        durationSec: durationSec || undefined,
        repeats,
      };

      if (session.config.feedbackMode === "imediato") {
        const evaluation = await evaluateInterviewAnswer({
          data: {
            ...context(session),
            question: current.question.text,
            answer: answer.trim(),
            starSuggested: current.question.starSuggested,
            source,
          },
        });
        last.evaluation = evaluation;
      }

      turns[turns.length - 1] = last;
      const next = { ...session, turns };
      persist(next);
      setAnswer("");
      setInterim("");
      setNeedsConfirm(false);
      setDurationSec(0);
      setRepeats(0);
      setPhase("aguardando");
      setShowFeedback(session.config.feedbackMode === "imediato");
      if (session.config.feedbackMode !== "imediato") {
        await advance(next);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível avaliar a resposta agora.",
      );
    } finally {
      setBusy("");
    }
  };

  const advance = async (base?: InterviewSession) => {
    const s = base ?? session;
    if (!s) return;
    stopAudio();
    const answered = s.turns.filter((t) => t.answer.trim()).length;
    if (answered >= s.config.questionCount) {
      await finish(s);
      return;
    }
    setBusy("proxima");
    try {
      const lastTurn = s.turns[s.turns.length - 1];
      const followUp =
        lastTurn?.evaluation?.needsFollowUp && lastTurn.evaluation.followUpQuestion
          ? lastTurn.evaluation.followUpQuestion
          : "";
      const question = await nextInterviewQuestion({
        data: {
          ...context(s),
          askedCount: answered,
          history: s.turns
            .filter((t) => t.answer.trim())
            .map((t) => ({
              question: t.question.text,
              answer: t.answer,
              ...(t.evaluation ? { overall: t.evaluation.overall } : {}),
            })),
          forceFollowUp: followUp,
        },
      });
      persist({
        ...s,
        turns: [...s.turns, { index: s.turns.length, question, answer: "", attempts: 0 }],
      });
      setShowFeedback(false);
      setAnswer("");
      setInterim("");
      setNeedsConfirm(false);
      setShowTranslation(false);
      setTyping(false);
      setPhase("aguardando");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível gerar a próxima pergunta.",
      );
    } finally {
      setBusy("");
    }
  };

  const retry = () => {
    if (!session || !current) return;
    const turns = [...session.turns];
    turns[turns.length - 1] = {
      ...current,
      answer: "",
      attempts: current.attempts + 1,
    };
    delete turns[turns.length - 1]!.evaluation;
    persist({ ...session, turns });
    setAnswer(current.answer);
    setShowFeedback(false);
    setNeedsConfirm(false);
    setPhase("aguardando");
  };

  const listenFeedback = () => {
    if (feedbackPlaying) {
      stopAudio();
      return;
    }
    const evaluation = current?.evaluation;
    if (!evaluation) return;
    const text =
      evaluation.spokenSummary ||
      `${evaluation.whatWorked[0] ?? ""} ${evaluation.toImprove[0] ?? ""}`.trim();
    if (!text) return;
    setFeedbackPlaying(true);
    setCaption(text);
    speak(text, {
      lang: "pt-BR",
      volume,
      onEnd: () => {
        setFeedbackPlaying(false);
        setCaption("");
      },
    });
  };

  if (!loaded) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Carregando…</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Entrevista não encontrada</h1>
        <p className="mt-3 text-muted-foreground">
          Esta simulação não está salva neste aparelho. Os dados ficam apenas no seu dispositivo.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/entrevista/nova" search={{}}>Iniciar nova entrevista</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/evolucao">Minha evolução</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (session.status !== "em_andamento") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">Esta entrevista já foi finalizada</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/entrevista/$id/relatorio" params={{ id: session.id }}>
              Ver relatório
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/entrevista/nova" search={{}}>Nova simulação</Link>
          </Button>
        </div>
      </div>
    );
  }

  const progress = Math.min(100, (answeredCount / session.config.questionCount) * 100);
  const waitingFeedback = showFeedback && current?.evaluation;
  const english = session.config.language === "en-US";
  const showTextArea = !voiceEnabled || typing || needsConfirm || answer.trim().length > 0;

  const stateLabel =
    busy === "avaliando"
      ? "Gerando avaliação da sua resposta…"
      : busy === "proxima"
        ? "Preparando a próxima pergunta…"
        : busy === "relatorio"
          ? "Montando seu relatório…"
          : phase === "reproduzindo"
            ? "Reproduzindo a pergunta…"
            : phase === "gravando"
              ? "Ouvindo sua resposta…"
              : phase === "pausado"
                ? "Gravação pausada"
                : phase === "transcricao"
                  ? "Transcrição disponível para revisão"
                  : "Aguardando sua resposta";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Card className="mb-6 shadow-card">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{session.jobTitle}</CardTitle>
              <CardDescription>
                {session.company || "Empresa não informada"} •{" "}
                {INTERVIEW_TYPE_LABELS[session.config.type]} • {LANGUAGE_LABELS[session.config.language]}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              Pergunta {Math.min(answeredCount + 1, session.config.questionCount)} de{" "}
              {session.config.questionCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Progress value={progress} aria-label="Progresso da entrevista" />
          <p aria-live="polite" className="text-sm font-medium text-muted-foreground">
            {stateLabel}
          </p>
        </CardContent>
      </Card>

      <Alert className="mb-4">
        <Info className="size-4" aria-hidden="true" />
        <AlertTitle>Conversa gerada por inteligência artificial</AlertTitle>
        <AlertDescription>
          Este treino é educativo, não substitui uma entrevista real e não garante aprovação.
          {answerMode !== "texto"
            ? " O áudio é utilizado somente para gerar a transcrição. Por padrão, a gravação não é armazenada."
            : ""}
        </AlertDescription>
      </Alert>

      {answerMode !== "texto" && !voiceSupported ? (
        <Alert className="mb-4 border-warning">
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>Voz indisponível neste navegador</AlertTitle>
          <AlertDescription>
            O recurso de voz não está disponível neste navegador. Você pode continuar a entrevista
            digitando suas respostas.
          </AlertDescription>
        </Alert>
      ) : null}

      {voiceMessage ? (
        <Alert className="mb-4 border-warning" role="status">
          <MicOff className="size-4" aria-hidden="true" />
          <AlertTitle>Aviso sobre o microfone</AlertTitle>
          <AlertDescription>{voiceMessage}</AlertDescription>
        </Alert>
      ) : null}

      {answerMode !== "texto" && ttsSupported ? (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="flex min-w-[200px] flex-1 items-center gap-3">
              <Label htmlFor="volume" className="text-sm">
                Volume da voz
              </Label>
              <Slider
                id="volume"
                className="max-w-40"
                value={[Math.round(volume * 100)]}
                onValueChange={([v]) => setVolume((v ?? 100) / 100)}
                max={100}
                step={10}
              />
            </div>
            <Button type="button" variant="outline" onClick={stopAudio}>
              <VolumeX className="size-4" aria-hidden="true" />
              Parar áudio
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                id="reduzir-animacao"
                checked={reduceMotion}
                onCheckedChange={setReduceMotion}
              />
              <Label htmlFor="reduzir-animacao" className="text-sm">
                Reduzir animações
              </Label>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {session.intro ? (
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-muted p-4">
              <p className="mb-1 text-sm font-semibold">Agente Recrutador</p>
              <p className="text-base whitespace-pre-line">{session.intro}</p>
            </div>
          </div>
        ) : null}

        {session.turns.map((turn) => (
          <div key={turn.index} className="grid gap-4">
            <div className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-5" aria-hidden="true" />
              </span>
              <div className="rounded-2xl rounded-tl-sm bg-muted p-4">
                <p className="mb-1 text-sm font-semibold">Agente Recrutador</p>
                <p className="text-base">{turn.question.text}</p>
                {turn.question.starSuggested ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Dica: organize a resposta em Situação, Tarefa, Ação e Resultado.
                  </p>
                ) : null}
              </div>
            </div>
            {turn.answer ? (
              <div className="flex flex-row-reverse gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <User className="size-5" aria-hidden="true" />
                </span>
                <div className="rounded-2xl rounded-tr-sm border p-4">
                  <p className="mb-1 text-sm font-semibold">
                    Você {turn.source === "voz" ? "(resposta falada)" : "(resposta digitada)"}
                  </p>
                  <p className="text-base whitespace-pre-line">{turn.answer}</p>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {caption ? (
          <p
            className="rounded-lg border bg-muted/60 p-3 text-sm"
            aria-live="polite"
          >
            <strong>Legenda do áudio:</strong> {caption}
          </p>
        ) : null}

        {waitingFeedback && current?.evaluation ? (
          <>
            <FeedbackCard
              evaluation={current.evaluation}
              onListen={listenFeedback}
              listening={feedbackPlaying}
              canListen={ttsSupported && answerMode !== "texto"}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={() => void advance()} disabled={busy !== ""}>
                {busy === "proxima" || busy === "relatorio" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {answeredCount >= session.config.questionCount
                  ? "Ver relatório final"
                  : "Continuar para a próxima pergunta"}
              </Button>
              <Button size="lg" variant="outline" onClick={retry} disabled={busy !== ""}>
                Tentar responder novamente
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sua resposta</CardTitle>
              <CardDescription>
                {voiceEnabled
                  ? "Fale ou digite. Você revisa a transcrição antes de enviar — nada é avaliado sem a sua confirmação."
                  : "Responda com calma e use exemplos reais do seu dia a dia."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {speakEnabled ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => listenQuestion(false)}>
                    <Volume2 className="size-4" aria-hidden="true" />
                    Ouvir pergunta
                  </Button>
                  <Button type="button" variant="outline" onClick={() => listenQuestion(true)}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Repetir pergunta
                  </Button>
                  {english ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowTranslation((v) => !v)}
                      >
                        {showTranslation ? "Ocultar tradução" : "Ver tradução da pergunta"}
                      </Button>
                      {current?.question.vocabulary.length ? (
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button type="button" variant="outline">
                              Ver ajuda de vocabulário
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3 grid gap-1 rounded-lg border p-4 text-sm">
                            {current.question.vocabulary.map((v, i) => (
                              <p key={i}>
                                <strong>{v.term}:</strong> {v.meaning}
                              </p>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              {english && showTranslation && current?.question.translation ? (
                <p className="rounded-lg border bg-muted/60 p-3 text-sm">
                  <strong>Tradução:</strong> {current.question.translation}
                </p>
              ) : null}

              {voiceEnabled ? (
                <div className="grid gap-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="lg"
                      className="h-16 min-w-56 text-base"
                      variant={phase === "gravando" ? "destructive" : "default"}
                      onClick={() =>
                        phase === "gravando"
                          ? finishRecording()
                          : void startRecording(phase === "pausado")
                      }
                      disabled={busy !== "" || phase === "reproduzindo"}
                      aria-pressed={phase === "gravando"}
                    >
                      {phase === "gravando" ? (
                        <Square className="size-5" aria-hidden="true" />
                      ) : (
                        <Mic className="size-5" aria-hidden="true" />
                      )}
                      {phase === "gravando"
                        ? "Finalizar resposta"
                        : phase === "pausado"
                          ? "Continuar gravação"
                          : "Começar a responder"}
                    </Button>

                    {phase === "gravando" ? (
                      <>
                        <span
                          className="flex items-center gap-2 rounded-full border border-destructive px-3 py-2 text-sm font-semibold text-destructive"
                          aria-live="polite"
                        >
                          <span
                            className={`inline-block size-3 rounded-full bg-destructive ${
                              reduceMotion ? "" : "animate-pulse"
                            }`}
                            aria-hidden="true"
                          />
                          Ouvindo sua resposta… {formatTime(elapsed)}
                        </span>
                        <Button type="button" variant="outline" onClick={pauseRecording}>
                          <Pause className="size-4" aria-hidden="true" />
                          Pausar gravação
                        </Button>
                      </>
                    ) : null}

                    {phase === "pausado" ? (
                      <Button type="button" variant="outline" onClick={() => void startRecording(true)}>
                        <Play className="size-4" aria-hidden="true" />
                        Continuar gravação
                      </Button>
                    ) : null}

                    {answer || phase === "pausado" || phase === "transcricao" ? (
                      <Button type="button" variant="outline" onClick={discardRecording}>
                        <RotateCcw className="size-4" aria-hidden="true" />
                        Descartar e gravar novamente
                      </Button>
                    ) : null}

                    <Button type="button" variant="ghost" onClick={() => setTyping((v) => !v)}>
                      <Keyboard className="size-4" aria-hidden="true" />
                      {typing ? "Voltar para a resposta falada" : "Responder digitando"}
                    </Button>
                  </div>

                  {interim ? (
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      {interim}…
                    </p>
                  ) : null}

                  <p className="text-sm text-muted-foreground">
                    Microfone:{" "}
                    {micPermission === "permitida"
                      ? "autorizado"
                      : micPermission === "negada"
                        ? "não autorizado"
                        : micPermission === "indisponivel"
                          ? "indisponível"
                          : "será solicitado ao começar a responder"}
                    .
                  </p>
                </div>
              ) : null}

              {showTextArea ? (
                <div className="grid gap-2">
                  <Label htmlFor="campo-resposta">
                    {needsConfirm ? "Revise a transcrição da sua fala" : "Sua resposta"}
                  </Label>
                  <Textarea
                    id="campo-resposta"
                    rows={7}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={english ? "Type your answer here…" : "Escreva aqui sua resposta…"}
                    disabled={busy !== "" || phase === "gravando"}
                  />
                </div>
              ) : null}

              {needsConfirm ? (
                <Alert>
                  <Info className="size-4" aria-hidden="true" />
                  <AlertTitle>Esta transcrição representa corretamente sua resposta?</AlertTitle>
                  <AlertDescription>
                    Você pode corrigir o texto antes de enviar. A avaliação só acontece depois da sua
                    confirmação.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  onClick={() => void submitAnswer()}
                  disabled={busy !== "" || phase === "gravando"}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-4" aria-hidden="true" />
                  )}
                  {busy === "avaliando"
                    ? "Analisando sua resposta…"
                    : busy === "proxima"
                      ? "Preparando a próxima pergunta…"
                      : busy === "relatorio"
                        ? "Montando seu relatório…"
                        : needsConfirm
                          ? "Confirmar e enviar"
                          : "Enviar resposta"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setConfirmEnd(true)}
                  disabled={busy !== ""}
                >
                  Encerrar entrevista
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <div ref={bottomRef} />
      </div>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogTitle>Encerrar a entrevista agora?</AlertDialogTitle>
          <AlertDialogHeader>
            <AlertDialogDescription>
              Vamos gerar o relatório com as respostas já enviadas. Você pode refazer a simulação
              quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar respondendo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmEnd(false);
                if (session) void finish(session);
              }}
            >
              Encerrar e ver relatório
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
