import { z } from "zod";

/* ---------------------------------- Vaga --------------------------------- */

export const workModelSchema = z.enum(["presencial", "hibrido", "remoto", "nao_identificado"]);
export type WorkModel = z.infer<typeof workModelSchema>;

export const jobRequirementSchema = z.object({
  text: z.string(),
  type: z.enum(["obrigatorio", "desejavel"]),
  category: z
    .enum([
      "formacao",
      "experiencia",
      "tecnico",
      "ferramenta",
      "certificacao",
      "idioma",
      "localizacao",
      "disponibilidade",
      "legal",
      "outro",
    ])
    .default("outro"),
});
export type JobRequirement = z.infer<typeof jobRequirementSchema>;

export const jobExtractionSchema = z.object({
  jobTitle: z.string().default(""),
  company: z.string().default(""),
  location: z.string().default(""),
  workModel: workModelSchema.default("nao_identificado"),
  seniority: z.string().default(""),
  area: z.string().default(""),
  language: z.string().default("pt-BR"),
  requirements: z.array(jobRequirementSchema).default([]),
  responsibilities: z.array(z.string()).default([]),
  keywords: z
    .array(
      z.object({
        term: z.string(),
        importance: z.enum(["essencial", "importante", "complementar"]).default("importante"),
      }),
    )
    .default([]),
  softSkills: z.array(z.string()).default([]),
});
export type JobExtraction = z.infer<typeof jobExtractionSchema>;

export interface JobAnalysis extends JobExtraction {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  sourceUrl: string;
  rawDescription: string;
  normalizedDescription: string;
}

/* -------------------------------- Currículo ------------------------------- */

export const resumeContentSchema = z.object({
  fullName: z.string().default(""),
  professionalTitle: z.string().default(""),
  location: z.string().default(""),
  contacts: z
    .object({
      email: z.string().default(""),
      phone: z.string().default(""),
      linkedin: z.string().default(""),
      portfolio: z.string().default(""),
    })
    .default({ email: "", phone: "", linkedin: "", portfolio: "" }),
  objective: z.string().default(""),
  summary: z.string().default(""),
  coreSkills: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  experiences: z
    .array(
      z.object({
        role: z.string().default(""),
        company: z.string().default(""),
        location: z.string().default(""),
        period: z.string().default(""),
        context: z.string().default(""),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string().default(""),
        institution: z.string().default(""),
        period: z.string().default(""),
        details: z.string().default(""),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().default(""),
        issuer: z.string().default(""),
        year: z.string().default(""),
      }),
    )
    .default([]),
  languages: z
    .array(z.object({ name: z.string().default(""), level: z.string().default("") }))
    .default([]),
  tools: z.array(z.string()).default([]),
  projects: z
    .array(
      z.object({
        name: z.string().default(""),
        description: z.string().default(""),
        period: z.string().default(""),
      }),
    )
    .default([]),
  additionalInfo: z.array(z.string()).default([]),
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;

export interface CandidateResume {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  sourceFileName: string;
  rawText: string;
  content: ResumeContent;
}

/* ------------------------------- Resultado -------------------------------- */

export const matchResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  scoreExplanation: z.string().default(""),
  categoryScores: z
    .object({
      experiencia: z.number().default(0),
      tecnicas: z.number().default(0),
      responsabilidades: z.number().default(0),
      formacao: z.number().default(0),
      palavrasChave: z.number().default(0),
      comportamentais: z.number().default(0),
      logistica: z.number().default(0),
    })
    .default({
      experiencia: 0,
      tecnicas: 0,
      responsabilidades: 0,
      formacao: 0,
      palavrasChave: 0,
      comportamentais: 0,
      logistica: 0,
    }),
  overview: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  attentionPoints: z.array(z.string()).default([]),
  improvementOpportunities: z.array(z.string()).default([]),
  transferableSkills: z.array(z.string()).default([]),
  qualitativeFit: z.string().default(""),
  evidenceMap: z
    .array(
      z.object({
        requirement: z.string(),
        type: z.enum(["obrigatorio", "desejavel"]).default("obrigatorio"),
        priority: z.enum(["alta", "media", "baixa"]).default("media"),
        evidence: z.string().default(""),
        adherence: z.enum(["atendido", "parcial", "nao_identificado"]).default("nao_identificado"),
        recommendation: z.string().default(""),
      }),
    )
    .default([]),
  keywordsFound: z
    .array(
      z.object({
        term: z.string(),
        strength: z.enum(["forte", "fraca"]).default("forte"),
        evidence: z.string().default(""),
      }),
    )
    .default([]),
  keywordsMissing: z
    .array(
      z.object({
        term: z.string(),
        importance: z.enum(["essencial", "importante", "complementar"]).default("importante"),
        why: z.string().default(""),
      }),
    )
    .default([]),
  gaps: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(["critica", "relevante", "moderada", "pequena"]).default("moderada"),
        category: z
          .enum(["redacao", "experiencia", "certificacao", "nao_corrigivel"])
          .default("redacao"),
        impact: z.string().default(""),
        reason: z.string().default(""),
        howToImprove: z.string().default(""),
        compensation: z.string().default(""),
        question: z.string().default(""),
      }),
    )
    .default([]),
  recommendations: z
    .array(
      z.object({
        priority: z.enum(["alta", "media", "baixa"]).default("media"),
        whatToChange: z.string(),
        why: z.string().default(""),
        currentExample: z.string().default(""),
        suggestedExample: z.string().default(""),
      }),
    )
    .default([]),
  atsChecklist: z
    .array(
      z.object({
        item: z.string(),
        status: z.enum(["ok", "atencao", "falha"]).default("ok"),
        note: z.string().default(""),
      }),
    )
    .default([]),
});
export type MatchResultData = z.infer<typeof matchResultSchema>;

export interface MatchResult extends MatchResultData {
  id: string;
  sessionId: string;
  jobId: string;
  resumeId: string;
  generatedAt: string;
}

/* ------------------------------- Versões ---------------------------------- */

export interface ResumeVersion {
  id: string;
  sessionId: string;
  jobId: string;
  originalResumeId: string;
  name: string;
  status: "original" | "direcionada" | "editada";
  content: ResumeContent;
  createdAt: string;
  updatedAt: string;
  isOriginal: boolean;
  isTailored: boolean;
}

export interface AnalysisRecord {
  id: string;
  sessionId: string;
  createdAt: string;
  job: JobAnalysis;
  resume: CandidateResume;
  match: MatchResult;
  versions: ResumeVersion[];
  confirmedExperiences: ConfirmedExperience[];
}

export interface ConfirmedExperience {
  term: string;
  context: string;
  companyOrProject: string;
  activity: string;
  result: string;
  period: string;
  tool: string;
}

export const confirmedExperienceSchema = z.object({
  term: z.string().min(1),
  context: z.string().min(3, "Descreva o contexto"),
  companyOrProject: z.string().default(""),
  activity: z.string().min(3, "Descreva a atividade realizada"),
  result: z.string().default(""),
  period: z.string().default(""),
  tool: z.string().default(""),
});

export const backupSchema = z.object({
  app: z.literal("matchcv"),
  version: z.literal(1),
  exportedAt: z.string(),
  analyses: z.array(z.any()),
});
