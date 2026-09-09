/**
 * Entrevista simulada sem IA paga.
 * Gera perguntas a partir da vaga e do currículo e devolve um feedback
 * estruturado calculado no próprio aplicativo.
 */
import type { z } from "zod";
import type { AnswerEvaluation, InterviewQuestion, InterviewReport } from "./schemas";
import type { evaluateInput, nextQuestionInput, openingInput, reportInput } from "./schemas";

type Ctx = z.infer<typeof openingInput>;

function clean(text: string) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function jobTerms(data: { jobDescription?: string; jobTitle?: string }) {
  const stop = new Set(
    "para com uma este esse pelo pela como mais menos deve todos todas seus suas sobre entre nossa nosso vaga empresa área nível experiência conhecimento atividades requisitos".split(
      " ",
    ),
  );
  const counts = new Map<string, number>();
  for (const raw of clean(data.jobDescription ?? "").toLowerCase().split(/[^\p{L}\p{N}+#.]+/u)) {
    if (raw.length < 4 || stop.has(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([term]) => term);
}

function question(
  text: string,
  kind: InterviewQuestion["kind"],
  why: string,
  starSuggested = false,
): InterviewQuestion {
  return {
    text,
    kind,
    why,
    starSuggested,
    isFollowUp: false,
    translation: "",
    vocabulary: [],
    spoken: text,
  };
}

function bank(data: Ctx): InterviewQuestion[] {
  const title = data.jobTitle || "a vaga";
  const terms = jobTerms(data);
  const t = (i: number) => terms[i] ?? "";

  const list: InterviewQuestion[] = [
    question(
      `Para começar, conte um pouco da sua trajetória e o que te motivou a se candidatar para ${title}.`,
      "rh",
      "Abre a conversa e conecta sua história à vaga.",
    ),
    question(
      `Quais das suas experiências você considera mais parecidas com o dia a dia de ${title}? Dê um exemplo concreto.`,
      "comportamental",
      "Mostra aderência real entre currículo e vaga.",
      true,
    ),
    question(
      t(0)
        ? `A vaga cita "${t(0)}". Conte uma situação em que você usou isso na prática, o que fez e qual foi o resultado.`
        : "Conte uma situação de trabalho difícil que você resolveu: o que fez e qual foi o resultado.",
      "tecnica",
      "Verifica evidência prática de um requisito da vaga.",
      true,
    ),
    question(
      "Conte sobre um erro ou dificuldade que você enfrentou no trabalho e o que aprendeu com isso.",
      "comportamental",
      "Avalia autoconhecimento e capacidade de aprender.",
      true,
    ),
    question(
      t(1)
        ? `Como você organiza suas prioridades quando aparecem várias demandas ao mesmo tempo, por exemplo envolvendo "${t(1)}"?`
        : "Como você organiza suas prioridades quando aparecem várias demandas ao mesmo tempo?",
      "gestor",
      "Mede organização e foco em entregas.",
    ),
    question(
      "Como você lida com feedback ou com uma cobrança direta do seu gestor?",
      "comportamental",
      "Avalia maturidade profissional.",
    ),
    question(
      t(2)
        ? `O que você já estudou ou praticou sobre "${t(2)}"?`
        : "O que você tem estudado para se desenvolver na sua área?",
      "tecnica",
      "Mostra atualização e interesse pela área.",
    ),
    question(
      "Descreva uma situação em que você precisou trabalhar com outra área ou com um colega difícil.",
      "comportamental",
      "Avalia colaboração e comunicação.",
      true,
    ),
    question(
      `Por que você acredita ser uma boa escolha para ${title}?`,
      "rh",
      "Fecha o alinhamento entre perfil e vaga.",
    ),
    question(
      "Quais são suas expectativas de crescimento e disponibilidade para começar?",
      "rh",
      "Alinha expectativas práticas.",
    ),
  ];

  if (data.config.type === "tecnica") return list.filter((q) => q.kind !== "rh").concat(list);
  if (data.config.type === "rh") return list.filter((q) => q.kind === "rh").concat(list);
  if (data.config.type === "comportamental")
    return list.filter((q) => q.kind === "comportamental").concat(list);
  if (data.config.type === "gestor") return list.filter((q) => q.kind !== "rh").concat(list);
  return list;
}

export function localOpening(data: Ctx) {
  const questions = bank(data);
  const intro = `Olá! Eu sou o recrutador desta simulação${
    data.jobTitle ? ` para a vaga de ${data.jobTitle}` : ""
  }${data.company ? ` na ${data.company}` : ""}. Vou fazer ${data.config.questionCount} perguntas, uma de cada vez, e você responde com calma. ${
    data.config.feedbackMode === "imediato"
      ? "Depois de cada resposta você recebe um comentário com pontos fortes e melhorias."
      : "O comentário completo vem no final."
  } Esta é uma simulação com fim educativo e não substitui uma entrevista real.`;
  return { intro, question: questions[0]! };
}

export function localNextQuestion(data: z.infer<typeof nextQuestionInput>) {
  const questions = bank(data as unknown as Ctx);
  const index = Math.min(data.askedCount, questions.length - 1);
  const next = questions[index]!;
  if (data.forceFollowUp) {
    return {
      ...next,
      isFollowUp: true,
      text: `Você pode detalhar melhor: ${data.forceFollowUp}? Conte o que exatamente você fez e qual foi o resultado.`,
      spoken: "Pode detalhar um pouco mais essa parte?",
    };
  }
  return next;
}

const CRITERIA = [
  "Aderência à pergunta",
  "Clareza",
  "Objetividade",
  "Organização da resposta",
  "Uso de exemplos reais",
  "Demonstração de competências",
  "Relação com a vaga",
  "Uso de resultados ou evidências",
  "Comunicação profissional",
  "Autenticidade e consistência com o currículo",
];

export function localEvaluate(data: z.infer<typeof evaluateInput>): AnswerEvaluation {
  const answer = clean(data.answer);
  const words = answer ? answer.split(" ").length : 0;
  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 3).length;
  const hasExample = /(por exemplo|quando eu|na empresa|no projeto|certa vez|em uma situa)/i.test(
    answer,
  );
  const hasResult = /(result|consegui|reduzi|aument|melhor|entreg|%|prazo)/i.test(answer);
  const jobWords = jobTerms(data as unknown as Ctx);
  const jobHits = jobWords.filter((w) => answer.toLowerCase().includes(w)).length;

  const lengthScore = words < 15 ? 2 : words < 40 ? 3 : words < 220 ? 5 : 4;
  const clarity = sentences >= 2 ? (words / Math.max(sentences, 1) < 40 ? 5 : 4) : 3;
  const exampleScore = hasExample ? 5 : words > 60 ? 3 : 2;
  const resultScore = hasResult ? 5 : 2;
  const jobScore = jobHits >= 2 ? 5 : jobHits === 1 ? 4 : 3;

  const values: Record<string, number> = {
    "Aderência à pergunta": lengthScore,
    Clareza: clarity,
    Objetividade: words > 320 ? 3 : lengthScore,
    "Organização da resposta": hasExample && hasResult ? 5 : 3,
    "Uso de exemplos reais": exampleScore,
    "Demonstração de competências": Math.round((exampleScore + jobScore) / 2),
    "Relação com a vaga": jobScore,
    "Uso de resultados ou evidências": resultScore,
    "Comunicação profissional": clarity,
    "Autenticidade e consistência com o currículo": hasExample ? 5 : 4,
  };

  const criteria = CRITERIA.map((name) => ({
    name,
    score: values[name] ?? 3,
    comment:
      (values[name] ?? 3) >= 4
        ? "Ponto bem resolvido nesta resposta."
        : "Dá para melhorar com mais detalhe e um exemplo concreto.",
  }));

  const overall =
    Math.round((criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length) * 10) / 10;

  const whatWorked: string[] = [];
  if (hasExample) whatWorked.push("Você trouxe um exemplo real, e isso dá credibilidade.");
  if (hasResult) whatWorked.push("Você citou um resultado, o que ajuda o recrutador a te avaliar.");
  if (jobHits) whatWorked.push("A resposta conversa com o que a vaga pede.");
  if (!whatWorked.length) whatWorked.push("Você respondeu à pergunta e manteve o tom profissional.");

  const toImprove: string[] = [];
  if (!hasExample) toImprove.push("Conte uma situação específica que você viveu, com contexto.");
  if (!hasResult) toImprove.push("Feche a resposta dizendo qual foi o resultado do que você fez.");
  if (words < 30) toImprove.push("A resposta ficou curta: desenvolva um pouco mais.");
  if (words > 320) toImprove.push("A resposta ficou longa: vá direto ao ponto principal.");
  if (!toImprove.length) toImprove.push("Continue treinando para deixar a fala mais fluida.");

  const missing = hasResult ? [] : ["Resultado ou impacto do que você fez"];

  return {
    criteria,
    overall: Math.min(5, Math.max(1, overall)),
    whatWorked,
    toImprove,
    missing,
    relateToJob: data.jobTitle
      ? `Relacione sempre o exemplo com o dia a dia de ${data.jobTitle}.`
      : "Relacione sempre o exemplo com o que a vaga pede.",
    suggestedStructure:
      "Situação (onde foi) → Tarefa (o que precisava resolver) → Ação (o que você fez) → Resultado (o que mudou).",
    improvedExample: answer
      ? `${answer.slice(0, 400)}${hasResult ? "" : " ... e o resultado disso foi (complete com um dado real seu)."}`
      : "",
    starGuide: {
      situacao: "Onde e quando aconteceu.",
      tarefa: "Qual era o desafio ou a sua responsabilidade.",
      acao: "O que exatamente você fez.",
      resultado: "O que melhorou depois da sua ação.",
    },
    needsFollowUp: !hasExample && words < 40,
    followUpQuestion: !hasExample
      ? "Pode contar uma situação específica em que isso aconteceu?"
      : "",
    spokenSummary: `${whatWorked[0]} ${toImprove[0]}`,
    languageNotes: [],
  };
}

export function localReport(data: z.infer<typeof reportInput>): InterviewReport {
  const scored = data.turns.filter((t) => typeof t.overall === "number");
  const average = scored.length
    ? scored.reduce((sum, t) => sum + (t.overall ?? 0), 0) / scored.length
    : 0;
  const sorted = [...scored].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));

  return {
    summary: `Você respondeu ${data.turns.length} perguntas nesta simulação${
      average ? `, com média ${average.toFixed(1)} de 5` : ""
    }. Este relatório foi montado pelo próprio aplicativo, com base no conteúdo das suas respostas.`,
    strengths: sorted.slice(0, 2).map((t) => `Boa resposta para: ${t.question}`),
    competencies: ["Comunicação", "Organização de ideias", "Uso de exemplos"],
    developmentAreas: sorted
      .slice(-2)
      .map((t) => `Treinar mais a resposta para: ${t.question}`),
    strongestAnswers: sorted.slice(0, 2).map((t) => ({
      question: t.question,
      why: "Resposta com bom nível de detalhe e ligação com a vaga.",
    })),
    answersToRedo: sorted.slice(-2).map((t) => ({
      question: t.question,
      why: "Faltou exemplo concreto ou resultado.",
    })),
    hardestQuestions: sorted.slice(-2).map((t) => t.question),
    realInterviewTips: [
      "Leve dois ou três exemplos prontos, com resultado, e adapte às perguntas.",
      "Fale devagar e termine cada resposta com o resultado do que você fez.",
      "Pesquise a empresa e prepare uma pergunta para o final.",
    ],
    actionPlan: [
      { action: "Escrever 3 histórias no formato STAR", why: "Facilita responder qualquer pergunta comportamental." },
      { action: "Revisar os requisitos da vaga e ligar cada um a uma experiência sua", why: "Aumenta a aderência percebida." },
      { action: "Refazer esta simulação em alguns dias", why: "Permite comparar sua evolução." },
    ],
    studySuggestions: ["Método STAR", "Como falar de resultados sem exagerar"],
    evolution: data.previousSummaries.length
      ? `Você já tem ${data.previousSummaries.length} simulações registradas. Compare as médias na tela Evolução.`
      : "Este é o seu primeiro registro e servirá de referência para as próximas simulações.",
  };
}
