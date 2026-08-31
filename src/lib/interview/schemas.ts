import { z } from "zod";

/* ------------------------------ Configuração ------------------------------ */

export const interviewTypeSchema = z.enum(["rh", "comportamental", "tecnica", "gestor", "completa"]);
export type InterviewType = z.infer<typeof interviewTypeSchema>;

export const difficultySchema = z.enum(["iniciante", "intermediario", "avancado"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const feedbackModeSchema = z.enum(["imediato", "final"]);
export type FeedbackMode = z.infer<typeof feedbackModeSchema>;

export const answerModeSchema = z.enum(["texto", "voz", "hibrido"]);
export type AnswerMode = z.infer<typeof answerModeSchema>;

export const languageSchema = z.enum(["pt-BR", "en-US"]);
export type InterviewLanguage = z.infer<typeof languageSchema>;

export const interviewConfigSchema = z.object({
  type: interviewTypeSchema.default("completa"),
  difficulty: difficultySchema.default("intermediario"),
  questionCount: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(5),
  feedbackMode: feedbackModeSchema.default("imediato"),
  answerMode: answerModeSchema.default("hibrido"),
  language: languageSchema.default("pt-BR"),
});
export type InterviewConfig = z.infer<typeof interviewConfigSchema>;

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  rh: "RH",
  comportamental: "Comportamental",
  tecnica: "Técnica",
  gestor: "Gestor da área",
  completa: "Entrevista completa",
};

export const ANSWER_MODE_LABELS: Record<AnswerMode, string> = {
  texto: "Entrevista por texto",
  voz: "Entrevista por voz",
  hibrido: "Modo híbrido — fale ou digite sua resposta",
};

export const LANGUAGE_LABELS: Record<InterviewLanguage, string> = {
  "pt-BR": "Português do Brasil",
  "en-US": "Inglês",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};


/* --------------------------------- Vaga ---------------------------------- */

export interface SavedJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  company: string;
  location: string;
  workModel: string;
  seniority: string;
  description: string;
  analysisId?: string;
}

/* ------------------------------- Currículo -------------------------------- */

export interface SavedResume {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  rawText: string;
  fileName: string;
  isPrimary: boolean;
  analysisId?: string;
}

/* -------------------------------- IA: saídas ------------------------------ */

export const questionSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(["rh", "comportamental", "tecnica", "gestor"]).default("rh"),
  why: z.string().default(""),
  starSuggested: z.boolean().default(false),
  isFollowUp: z.boolean().default(false),
  /** Tradução para português — mostrada só quando o usuário pedir (entrevista em inglês). */
  translation: z.string().default(""),
  /** Ajuda de vocabulário para a entrevista em inglês. */
  vocabulary: z
    .array(z.object({ term: z.string(), meaning: z.string().default("") }))
    .default([]),
  /** Fala curta do recrutador, para leitura em voz alta. */
  spoken: z.string().default(""),
});

export type InterviewQuestion = z.infer<typeof questionSchema>;

export const openingSchema = z.object({
  intro: z.string().default(""),
  question: questionSchema,
});

export const evaluationSchema = z.object({
  criteria: z
    .array(
      z.object({
        name: z.string(),
        score: z.number().min(1).max(5),
        comment: z.string().default(""),
      }),
    )
    .default([]),
  overall: z.number().min(1).max(5).default(3),
  whatWorked: z.array(z.string()).default([]),
  toImprove: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  relateToJob: z.string().default(""),
  suggestedStructure: z.string().default(""),
  improvedExample: z.string().default(""),
  starGuide: z
    .object({
      situacao: z.string().default(""),
      tarefa: z.string().default(""),
      acao: z.string().default(""),
      resultado: z.string().default(""),
    })
    .default({ situacao: "", tarefa: "", acao: "", resultado: "" }),
  needsFollowUp: z.boolean().default(false),
  followUpQuestion: z.string().default(""),
  /** Resumo curto do feedback, pensado para ser ouvido em áudio. */
  spokenSummary: z.string().default(""),
  /** Observações de idioma (entrevista em inglês): só o que atrapalha o entendimento. */
  languageNotes: z.array(z.string()).default([]),

});
export type AnswerEvaluation = z.infer<typeof evaluationSchema>;

export const reportSchema = z.object({
  summary: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  competencies: z.array(z.string()).default([]),
  developmentAreas: z.array(z.string()).default([]),
  strongestAnswers: z
    .array(z.object({ question: z.string(), why: z.string().default("") }))
    .default([]),
  answersToRedo: z
    .array(z.object({ question: z.string(), why: z.string().default("") }))
    .default([]),
  hardestQuestions: z.array(z.string()).default([]),
  realInterviewTips: z.array(z.string()).default([]),
  actionPlan: z
    .array(z.object({ action: z.string(), why: z.string().default("") }))
    .default([]),
  studySuggestions: z.array(z.string()).default([]),
  evolution: z.string().default(""),
});
export type InterviewReport = z.infer<typeof reportSchema>;

/* ------------------------------- Entrevista ------------------------------- */

export interface InterviewTurn {
  index: number;
  question: InterviewQuestion;
  /** Texto confirmado pelo usuário — nunca substituído por texto criado pela IA. */
  answer: string;
  answeredAt?: string;
  evaluation?: AnswerEvaluation;
  attempts: number;
  /** Origem da resposta confirmada. */
  source?: "voz" | "texto";
  /** Idioma usado nesta resposta. */
  language?: InterviewLanguage;
  /** Duração aproximada da resposta, em segundos. Sem áudio armazenado. */
  durationSec?: number;
  /** Quantas vezes o candidato pediu para repetir a pergunta. */
  repeats?: number;
}


export interface InterviewSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  jobId: string;
  resumeId: string;
  jobTitle: string;
  company: string;
  config: InterviewConfig;
  intro: string;
  turns: InterviewTurn[];
  status: "em_andamento" | "concluida" | "encerrada";
  report?: InterviewReport;
  averageScore?: number;
}

/* ------------------------------ Entradas RPC ------------------------------ */

const contextInput = z.object({
  jobTitle: z.string().default(""),
  company: z.string().default(""),
  seniority: z.string().default(""),
  jobDescription: z.string().default(""),
  resumeText: z.string().default(""),
  config: interviewConfigSchema,
});

export const openingInput = contextInput;

export const nextQuestionInput = contextInput.extend({
  askedCount: z.number().int().min(0),
  history: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string().default(""),
        overall: z.number().optional(),
      }),
    )
    .default([]),
  forceFollowUp: z.string().default(""),
});

export const evaluateInput = contextInput.extend({
  question: z.string().min(1),
  answer: z.string().min(1),
  starSuggested: z.boolean().default(false),
  source: z.enum(["voz", "texto"]).default("texto"),
});

export const reportInput = contextInput.extend({
  turns: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string().default(""),
        overall: z.number().optional(),
        criteria: z.array(z.object({ name: z.string(), score: z.number() })).default([]),
        source: z.enum(["voz", "texto"]).default("texto"),
        durationSec: z.number().optional(),
        repeats: z.number().optional(),
      }),

    )
    .default([]),
  previousSummaries: z
    .array(z.object({ date: z.string(), jobTitle: z.string(), average: z.number() }))
    .default([]),
});
