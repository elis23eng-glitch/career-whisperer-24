import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Bot, CheckCircle2, Info, Loader2, Send, User } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
  type AnswerEvaluation,
  type InterviewSession,
} from "@/lib/interview/schemas";
import { listInterviews } from "@/lib/interview/store";

export const Route = createFileRoute("/entrevista/$id")({
  head: () => ({
    meta: [
      { title: "Sala de entrevista | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Responda às perguntas do Agente Recrutador uma de cada vez e receba feedback claro sobre cada resposta.",
      },
      { property: "og:title", content: "Sala de entrevista | MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Entrevista simulada personalizada para a vaga escolhida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InterviewRoom,
});

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

function FeedbackCard({ evaluation }: { evaluation: AnswerEvaluation }) {
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
  const [busy, setBusy] = useState<"" | "avaliando" | "proxima" | "relatorio">("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(getInterview(id) ?? null);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session?.turns.length, showFeedback]);

  const current = useMemo(() => session?.turns[session.turns.length - 1], [session]);
  const answeredCount = useMemo(
    () => session?.turns.filter((t) => t.answer.trim().length > 0).length ?? 0,
    [session],
  );

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
      toast.error("Escreva um pouco mais para o recrutador conseguir avaliar sua resposta.");
      return;
    }
    setBusy("avaliando");
    try {
      const turns = [...session.turns];
      const last = { ...current, answer: answer.trim(), answeredAt: new Date().toISOString() };

      if (session.config.feedbackMode === "imediato") {
        const evaluation = await evaluateInterviewAnswer({
          data: {
            ...context(session),
            question: current.question.text,
            answer: answer.trim(),
            starSuggested: current.question.starSuggested,
          },
        });
        last.evaluation = evaluation;
      }

      turns[turns.length - 1] = last;
      const next = { ...session, turns };
      persist(next);
      setAnswer("");
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
            <Link to="/entrevista/nova">Iniciar nova entrevista</Link>
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
            <Link to="/entrevista/nova">Nova simulação</Link>
          </Button>
        </div>
      </div>
    );
  }

  const progress = Math.min(100, (answeredCount / session.config.questionCount) * 100);
  const waitingFeedback = showFeedback && current?.evaluation;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Card className="mb-6 shadow-card">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{session.jobTitle}</CardTitle>
              <CardDescription>
                {session.company || "Empresa não informada"} •{" "}
                {INTERVIEW_TYPE_LABELS[session.config.type]}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              Pergunta {Math.min(answeredCount + 1, session.config.questionCount)} de{" "}
              {session.config.questionCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} aria-label="Progresso da entrevista" />
        </CardContent>
      </Card>

      <Alert className="mb-6">
        <Info className="size-4" aria-hidden="true" />
        <AlertTitle>Conversa gerada por inteligência artificial</AlertTitle>
        <AlertDescription>
          Este treino é educativo, não substitui uma entrevista real e não garante aprovação.
        </AlertDescription>
      </Alert>

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
                  <p className="mb-1 text-sm font-semibold">Você</p>
                  <p className="text-base whitespace-pre-line">{turn.answer}</p>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {waitingFeedback && current?.evaluation ? (
          <>
            <FeedbackCard evaluation={current.evaluation} />
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
                Responda com calma e use exemplos reais do seu dia a dia.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Textarea
                rows={7}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Escreva aqui sua resposta…"
                aria-label="Campo de resposta"
                disabled={busy !== ""}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={() => void submitAnswer()} disabled={busy !== ""}>
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
