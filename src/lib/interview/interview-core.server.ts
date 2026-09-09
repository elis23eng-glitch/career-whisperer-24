import { callAi, isAiUnavailable } from "@/lib/ai-core.server";
import {
  DIFFICULTY_LABELS,
  INTERVIEW_TYPE_LABELS,
  evaluationSchema,
  openingSchema,
  questionSchema,
  reportSchema,
} from "./schemas";
import type { z } from "zod";
import type { evaluateInput, nextQuestionInput, openingInput, reportInput } from "./schemas";

const RECRUITER_SYSTEM = `Você é um recrutador profissional, experiente, respeitoso, imparcial e acolhedor,
conduzindo uma entrevista simulada com finalidade educativa.

REGRAS OBRIGATÓRIAS:
- Fale sempre em português do Brasil, com linguagem simples, clara e acessível a pessoas de qualquer idade
  e a quem tem pouca familiaridade com processos seletivos. Explique termos técnicos quando usá-los.
- Faça apenas UMA pergunta por vez.
- Baseie as perguntas na vaga selecionada e no currículo do candidato. Nunca faça perguntas genéricas
  desconectadas da vaga.
- Nunca invente experiências, empresas, projetos, ferramentas, números ou resultados que não estejam
  no currículo ou nas respostas do candidato.
- Nunca prometa aprovação, contratação ou resultado em processo seletivo real.
- Nunca pergunte nem avalie idade, aparência, gênero, raça, estado civil, filhos, deficiência, religião,
  orientação sexual, origem ou qualquer característica pessoal protegida.
- Mantenha tom encorajador. Nunca diminua, ironize ou constranja o candidato.
- Deixe claro, quando fizer sentido, que esta é uma simulação educativa e não substitui a avaliação
  de uma empresa real.
- Responda SEMPRE apenas com JSON válido no formato solicitado.`;

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

const QUESTION_HINT = `{"text":"","kind":"rh|comportamental|tecnica|gestor","why":"","starSuggested":false,"isFollowUp":false,"translation":"","vocabulary":[{"term":"","meaning":""}],"spoken":""}`;
const OPENING_HINT = `{"intro":"","question":${QUESTION_HINT}}`;
const EVAL_HINT = `{"criteria":[{"name":"","score":1,"comment":""}],"overall":1,"whatWorked":[""],"toImprove":[""],"missing":[""],"relateToJob":"","suggestedStructure":"","improvedExample":"","starGuide":{"situacao":"","tarefa":"","acao":"","resultado":""},"needsFollowUp":false,"followUpQuestion":"","spokenSummary":"","languageNotes":[""]}`;
const REPORT_HINT = `{"summary":"","strengths":[""],"competencies":[""],"developmentAreas":[""],"strongestAnswers":[{"question":"","why":""}],"answersToRedo":[{"question":"","why":""}],"hardestQuestions":[""],"realInterviewTips":[""],"actionPlan":[{"action":"","why":""}],"studySuggestions":[""],"evolution":""}`;

type Ctx = z.infer<typeof openingInput>;

function isEnglish(data: Ctx) {
  return data.config.language === "en-US";
}

function languageBlock(data: Ctx) {
  if (isEnglish(data)) {
    return `IDIOMA DA ENTREVISTA: Inglês (en-US).
- Escreva "intro", "text" e "spoken" em inglês natural de entrevista.
- Preencha "translation" com a tradução da pergunta para português (será mostrada só se o
  candidato pedir) e "vocabulary" com 3 a 6 termos úteis da pergunta, com explicação simples
  em português.
- Nas avaliações, escreva os comentários em português, mas mantenha os exemplos de resposta
  em inglês.
- Nunca avalie sotaque, pronúncia nativa, voz, timbre ou velocidade da fala. Aponte apenas
  erros de idioma que atrapalhem o entendimento, em "languageNotes", com tom educativo.`;
  }
  return `IDIOMA DA ENTREVISTA: Português do Brasil (pt-BR). Deixe "translation" e "vocabulary" vazios.`;
}

function voiceBlock(data: Ctx) {
  const mode = data.config.answerMode;
  const spoken = `O campo "spoken" é a fala curta do recrutador, lida em voz alta: no máximo 2 frases,
frases simples, sem listas, sem marcadores e sem repetir a pergunta inteira duas vezes.`;
  if (mode === "texto") return spoken;
  return `${spoken}
A resposta do candidato pode chegar por voz, transcrita automaticamente. Ignore falhas de
transcrição, repetições, gaguejos e pontuação irregular: avalie o conteúdo. Nunca avalie voz,
sotaque, timbre, volume, idade percebida, gênero ou condição de fala.`;
}

function contextBlock(data: Ctx) {
  const { config } = data;
  return `VAGA: ${data.jobTitle || "não informada"}${data.company ? ` — ${data.company}` : ""}
SENIORIDADE: ${data.seniority || "não informada"}
DESCRIÇÃO DA VAGA: """${(data.jobDescription ?? "").slice(0, 9000)}"""
CURRÍCULO DO CANDIDATO: """${(data.resumeText ?? "").slice(0, 12000)}"""
TIPO DE ENTREVISTA: ${INTERVIEW_TYPE_LABELS[config.type]}
NÍVEL DE DIFICULDADE: ${DIFFICULTY_LABELS[config.difficulty]}
TOTAL DE PERGUNTAS DA SIMULAÇÃO: ${config.questionCount}
MODO DE RESPOSTA: ${config.answerMode}

${languageBlock(data)}

${voiceBlock(data)}`;
}


function typeGuidance(type: Ctx["config"]["type"]) {
  if (type === "completa")
    return "Distribua as perguntas entre RH, comportamentais, técnicas e de gestor da área, nessa ordem aproximada.";
  if (type === "tecnica")
    return "Faça perguntas técnicas construídas a partir dos conhecimentos e ferramentas realmente pedidos na vaga.";
  if (type === "gestor")
    return "Assuma o papel do gestor da área: foque em entregas, resolução de problemas, prioridades e trabalho com outras áreas.";
  if (type === "comportamental")
    return "Foque em situações reais vividas pelo candidato, incentivando o método STAR.";
  return "Foque em perguntas típicas de RH: trajetória, motivação, expectativas, disponibilidade e alinhamento com a vaga.";
}

export async function runOpening(data: Ctx) {
  try {
    return await callAi(
    RECRUITER_SYSTEM,
    `Inicie uma entrevista simulada.
Em "intro", apresente-se brevemente como recrutador, apresente a vaga em 2 ou 3 frases e explique como a
simulação vai funcionar (uma pergunta por vez, ${data.config.questionCount} perguntas, feedback ${
      data.config.feedbackMode === "imediato" ? "após cada resposta" : "somente no final"
    }, finalidade educativa).
Em "question", traga a PRIMEIRA pergunta, conectada à vaga e ao currículo.
${typeGuidance(data.config.type)}

${contextBlock(data)}`,
    openingSchema,
    OPENING_HINT,
  );
  } catch (error) {
    if (!isAiUnavailable(error)) throw error;
    const { localOpening } = await import("./local-interview.server");
    return localOpening(data);
  }
}

export async function runNextQuestion(data: z.infer<typeof nextQuestionInput>) {
  const history = data.history
    .map((h, i) => `P${i + 1}: ${h.question}\nR${i + 1}: ${h.answer || "(sem resposta)"}`)
    .join("\n\n")
    .slice(0, 12000);

  const followUp = data.forceFollowUp
    ? `\nA resposta anterior ficou incompleta. Faça uma pergunta de aprofundamento sobre: ${data.forceFollowUp}. Marque isFollowUp como true.`
    : "";

  try {
    return await callAi(
    RECRUITER_SYSTEM,
    `Gere a pergunta número ${data.askedCount + 1} de ${data.config.questionCount} desta entrevista.
Considere as respostas anteriores para adaptar a pergunta e evitar repetição.
${typeGuidance(data.config.type)}${followUp}

${contextBlock(data)}

HISTÓRICO DA CONVERSA:
${history || "(ainda não há respostas)"}`,
    questionSchema,
    QUESTION_HINT,
  );
  } catch (error) {
    if (!isAiUnavailable(error)) throw error;
    const { localNextQuestion } = await import("./local-interview.server");
    return localNextQuestion(data);
  }
}

export async function runEvaluate(data: z.infer<typeof evaluateInput>) {
  try {
    return await callAi(
    RECRUITER_SYSTEM,
    `Avalie a resposta do candidato.
Em "criteria", avalie EXATAMENTE estes critérios, cada um com nota de 1 a 5 e um comentário explicando a nota:
${CRITERIA.map((c) => `- ${c}`).join("\n")}
"overall" é a média arredondada em uma casa decimal, de 1 a 5.
Em "spokenSummary", escreva um resumo falado de no máximo 3 frases curtas, encorajador, com o ponto
forte principal e a melhoria principal — é este texto que será lido em voz alta.
A resposta pode ter vindo de uma transcrição de voz (origem: ${data.source}); nunca comente voz,
sotaque, timbre, velocidade ou características pessoais.

Em "improvedExample", reescreva a resposta usando SOMENTE as informações que o candidato realmente forneceu
e o que consta no currículo. Não invente cargos, projetos, resultados, ferramentas ou conhecimentos.
Se faltarem informações essenciais, aponte em "missing" e defina needsFollowUp como true com uma
"followUpQuestion" clara.
${data.starSuggested ? 'Preencha "starGuide" mostrando como organizar a resposta em Situação, Tarefa, Ação e Resultado com base no que o candidato contou.' : ""}

${contextBlock(data)}

PERGUNTA: """${data.question}"""
RESPOSTA DO CANDIDATO: """${data.answer.slice(0, 6000)}"""`,
    evaluationSchema,
    EVAL_HINT,
  );
  } catch (error) {
    if (!isAiUnavailable(error)) throw error;
    const { localEvaluate } = await import("./local-interview.server");
    return localEvaluate(data);
  }
}

export async function runReport(data: z.infer<typeof reportInput>) {
  const turns = data.turns
    .map(
      (t, i) =>
        `P${i + 1}: ${t.question}\nR${i + 1}: ${t.answer || "(sem resposta)"}\nNota geral: ${
          t.overall ?? "não avaliada"
        }`,
    )
    .join("\n\n")
    .slice(0, 16000);

  const previous = data.previousSummaries.length
    ? data.previousSummaries
        .map((p) => `${p.date} — ${p.jobTitle} — média ${p.average.toFixed(1)}/5`)
        .join("\n")
    : "";

  try {
    return await callAi(
    RECRUITER_SYSTEM,
    `Gere o relatório final desta entrevista simulada, em linguagem simples e encorajadora.
"actionPlan" deve ter exatamente 3 ações prioritárias de preparação.
"evolution" deve comparar com as simulações anteriores quando houver histórico; se não houver,
explique que este é o primeiro registro e servirá de referência.
Não prometa aprovação e lembre que a análise é educativa.

${contextBlock(data)}

ENTREVISTA COMPLETA:
${turns}

SIMULAÇÕES ANTERIORES:
${previous || "(nenhuma)"}`,
    reportSchema,
    REPORT_HINT,
  );
  } catch (error) {
    if (!isAiUnavailable(error)) throw error;
    const { localReport } = await import("./local-interview.server");
    return localReport(data);
  }
}
