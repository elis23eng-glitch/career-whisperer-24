import { z } from "zod";

export const MODEL = "openai/gpt-5.5";

export const analyzeInput = z.object({
  jobText: z.string().min(30),
  jobUrl: z.string().default(""),
  resumeText: z.string().min(30),
});

export const generateInput = z.object({
  jobText: z.string().min(10),
  jobExtraction: z.any(),
  resumeContent: z.any(),
  resumeRawText: z.string().default(""),
  confirmedExperiences: z.array(z.any()).default([]),
});

export const rewriteInput = z.object({
  text: z.string().min(1).max(4000),
  action: z.string().min(1),
  jobTitle: z.string().default(""),
});

export const urlInput = z.object({ url: z.string().url() });

export const suggestionSchema = z.object({ suggestion: z.string().min(1) });

export const ANALYST_SYSTEM = `Você é um especialista em recrutamento, seleção, currículos ATS e análise de vagas.
Compare a descrição da vaga com o currículo fornecido. Diferencie requisitos obrigatórios, desejáveis,
responsabilidades, competências técnicas, competências comportamentais e palavras-chave.
Use somente evidências presentes no currículo. Não invente experiências, resultados, certificações,
ferramentas ou competências. Quando não houver evidência, marque como não identificado.
Considere contexto, sinônimos e competências transferíveis.
Responda sempre em português do Brasil e retorne JSON estruturado conforme o schema solicitado.`;

export const WRITER_SYSTEM = `Crie uma versão ATS Friendly do currículo, direcionada à vaga fornecida.
Use exclusivamente fatos presentes no currículo original ou informações posteriormente confirmadas pelo usuário.
Não invente dados, percentuais ou resultados. Priorize experiências relevantes, reorganize competências,
melhore a redação, utilize verbos de ação e incorpore palavras-chave da vaga de forma natural.
Preserve empresas, cargos, datas, formação e resultados originais. Estrutura simples, uma coluna, sem foto,
sem tabelas e sem barras de habilidade. Responda em português do Brasil, em JSON estruturado por seções.`;

export const REWRITER_SYSTEM = `Você reescreve trechos de currículo preservando integralmente os fatos originais.
Não invente empresas, datas, números, resultados ou competências. Responda em português do Brasil.`;

export const JOB_HINT = `{"jobTitle":"","company":"","location":"","workModel":"presencial|hibrido|remoto|nao_identificado","seniority":"","area":"","language":"","requirements":[{"text":"","type":"obrigatorio|desejavel","category":"formacao|experiencia|tecnico|ferramenta|certificacao|idioma|localizacao|disponibilidade|legal|outro"}],"responsibilities":[""],"keywords":[{"term":"","importance":"essencial|importante|complementar"}],"softSkills":[""]}`;

export const RESUME_HINT = `{"fullName":"","professionalTitle":"","location":"","contacts":{"email":"","phone":"","linkedin":"","portfolio":""},"objective":"","summary":"","coreSkills":[""],"softSkills":[""],"experiences":[{"role":"","company":"","location":"","period":"","context":"","bullets":[""]}],"education":[{"degree":"","institution":"","period":"","details":""}],"certifications":[{"name":"","issuer":"","year":""}],"languages":[{"name":"","level":""}],"tools":[""],"projects":[{"name":"","description":"","period":""}],"additionalInfo":[""]}`;

export const MATCH_HINT = `{"overallScore":0,"atsScore":0,"scoreExplanation":"","categoryScores":{"experiencia":0,"tecnicas":0,"responsabilidades":0,"formacao":0,"palavrasChave":0,"comportamentais":0,"logistica":0},"overview":"","strengths":[""],"attentionPoints":[""],"improvementOpportunities":[""],"transferableSkills":[""],"qualitativeFit":"","evidenceMap":[{"requirement":"","type":"obrigatorio|desejavel","priority":"alta|media|baixa","evidence":"","adherence":"atendido|parcial|nao_identificado","recommendation":""}],"keywordsFound":[{"term":"","strength":"forte|fraca","evidence":""}],"keywordsMissing":[{"term":"","importance":"essencial|importante|complementar","why":""}],"gaps":[{"title":"","severity":"critica|relevante|moderada|pequena","category":"redacao|experiencia|certificacao|nao_corrigivel","impact":"","reason":"","howToImprove":"","compensation":"","question":""}],"recommendations":[{"priority":"alta|media|baixa","whatToChange":"","why":"","currentExample":"","suggestedExample":""}],"atsChecklist":[{"item":"","status":"ok|atencao|falha","note":""}]}`;
