import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  jobExtractionSchema,
  matchResultSchema,
  resumeContentSchema,
} from "./types";

const MODEL = "openai/gpt-5.5";

const analyzeInput = z.object({
  jobText: z.string().min(30),
  jobUrl: z.string().default(""),
  resumeText: z.string().min(30),
});

const generateInput = z.object({
  jobText: z.string().min(10),
  jobExtraction: z.any(),
  resumeContent: z.any(),
  resumeRawText: z.string().default(""),
  confirmedExperiences: z.array(z.any()).default([]),
});

const rewriteInput = z.object({
  text: z.string().min(1).max(4000),
  action: z.string().min(1),
  jobTitle: z.string().default(""),
});

const ANALYST_SYSTEM = `Você é um especialista em recrutamento, seleção, currículos ATS e análise de vagas.
Compare a descrição da vaga com o currículo fornecido. Diferencie requisitos obrigatórios, desejáveis,
responsabilidades, competências técnicas, competências comportamentais e palavras-chave.
Use somente evidências presentes no currículo. Não invente experiências, resultados, certificações,
ferramentas ou competências. Quando não houver evidência, marque como não identificado.
Considere contexto, sinônimos e competências transferíveis.
Responda sempre em português do Brasil e retorne JSON estruturado conforme o schema solicitado.`;

const WRITER_SYSTEM = `Crie uma versão ATS Friendly do currículo, direcionada à vaga fornecida.
Use exclusivamente fatos presentes no currículo original ou informações posteriormente confirmadas pelo usuário.
Não invente dados, percentuais ou resultados. Priorize experiências relevantes, reorganize competências,
melhore a redação, utilize verbos de ação e incorpore palavras-chave da vaga de forma natural.
Preserve empresas, cargos, datas, formação e resultados originais. Estrutura simples, uma coluna, sem foto,
sem tabelas e sem barras de habilidade. Responda em português do Brasil, em JSON estruturado por seções.`;

async function callAi<T>(
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  schemaHint: string,
): Promise<T> {
  const { requireApiKey, createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(requireApiKey());

  const run = async (extra: string) => {
    const res = await generateText({
      model: gateway(MODEL),
      system,
      prompt: `${prompt}\n\nRetorne SOMENTE um JSON válido com esta forma:\n${schemaHint}${extra}`,
    });
    return res.text ?? "";
  };

  const parseJson = (raw: string) => {
    const cleaned = raw
      .replace(/^```(?:json)?/gm, "")
      .replace(/```$/gm, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("json");
    return JSON.parse(cleaned.slice(start, end + 1));
  };

  let text = "";
  try {
    text = await run("");
    return schema.parse(parseJson(text));
  } catch (first) {
    try {
      const retry = await run(
        "\n\nATENÇÃO: a resposta anterior não era um JSON válido conforme o schema. Retorne apenas JSON válido, sem comentários e sem texto adicional.",
      );
      return schema.parse(parseJson(retry));
    } catch {
      throw new Error(
        `A resposta da IA não pôde ser validada. Detalhe técnico: ${
          first instanceof Error ? first.message : "erro desconhecido"
        }`,
      );
    }
  }
}

const jobHint = `{"jobTitle":"","company":"","location":"","workModel":"presencial|hibrido|remoto|nao_identificado","seniority":"","area":"","language":"","requirements":[{"text":"","type":"obrigatorio|desejavel","category":"formacao|experiencia|tecnico|ferramenta|certificacao|idioma|localizacao|disponibilidade|legal|outro"}],"responsibilities":[""],"keywords":[{"term":"","importance":"essencial|importante|complementar"}],"softSkills":[""]}`;

const resumeHint = `{"fullName":"","professionalTitle":"","location":"","contacts":{"email":"","phone":"","linkedin":"","portfolio":""},"objective":"","summary":"","coreSkills":[""],"softSkills":[""],"experiences":[{"role":"","company":"","location":"","period":"","context":"","bullets":[""]}],"education":[{"degree":"","institution":"","period":"","details":""}],"certifications":[{"name":"","issuer":"","year":""}],"languages":[{"name":"","level":""}],"tools":[""],"projects":[{"name":"","description":"","period":""}],"additionalInfo":[""]}`;

const matchHint = `{"overallScore":0,"atsScore":0,"scoreExplanation":"","categoryScores":{"experiencia":0,"tecnicas":0,"responsabilidades":0,"formacao":0,"palavrasChave":0,"comportamentais":0,"logistica":0},"overview":"","strengths":[""],"attentionPoints":[""],"improvementOpportunities":[""],"transferableSkills":[""],"qualitativeFit":"","evidenceMap":[{"requirement":"","type":"obrigatorio|desejavel","priority":"alta|media|baixa","evidence":"","adherence":"atendido|parcial|nao_identificado","recommendation":""}],"keywordsFound":[{"term":"","strength":"forte|fraca","evidence":""}],"keywordsMissing":[{"term":"","importance":"essencial|importante|complementar","why":""}],"gaps":[{"title":"","severity":"critica|relevante|moderada|pequena","category":"redacao|experiencia|certificacao|nao_corrigivel","impact":"","reason":"","howToImprove":"","compensation":"","question":""}],"recommendations":[{"priority":"alta|media|baixa","whatToChange":"","why":"","currentExample":"","suggestedExample":""}],"atsChecklist":[{"item":"","status":"ok|atencao|falha","note":""}]}`;

export const analyzeMatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => analyzeInput.parse(input))
  .handler(async ({ data }) => {
    const job = await callAi(
      ANALYST_SYSTEM,
      `Extraia os dados estruturados desta descrição de vaga. Se um campo não estiver presente, deixe vazio.\n\nDESCRIÇÃO DA VAGA:\n"""${data.jobText.slice(0, 20000)}"""`,
      jobExtractionSchema,
      jobHint,
    );

    const resume = await callAi(
      ANALYST_SYSTEM,
      `Organize o texto do currículo abaixo nas seções do schema. Nunca invente dados: se algo não existir, deixe vazio.\n\nCURRÍCULO:\n"""${data.resumeText.slice(0, 25000)}"""`,
      resumeContentSchema,
      resumeHint,
    );

    const match = await callAi(
      ANALYST_SYSTEM,
      `Compare a vaga e o currículo abaixo.
Calcule um índice geral de 0 a 100 com esta ponderação: experiência 25%, competências técnicas 25%,
responsabilidades semelhantes 20%, formação e certificações 10%, palavras-chave 10%,
competências comportamentais 5%, localização/modalidade/disponibilidade 5%.
Cada categoryScores é de 0 a 100. Explique o score em 2 ou 3 frases (scoreExplanation).
Também avalie o currículo atual quanto à leitura por sistemas ATS (atsScore de 0 a 100 e atsChecklist
com os itens: títulos de seções reconhecíveis, dados de contato legíveis, ordem cronológica,
uso de palavras-chave, ausência de tabelas complexas, ausência de imagens, ausência de colunas múltiplas,
consistência de datas, tamanho adequado, bullets objetivos, ortografia, compatibilidade com a vaga).
Liste no evidenceMap todos os requisitos obrigatórios e desejáveis com a evidência literal do currículo.

VAGA (estruturada): ${JSON.stringify(job).slice(0, 12000)}

VAGA (texto): """${data.jobText.slice(0, 12000)}"""

CURRÍCULO (estruturado): ${JSON.stringify(resume).slice(0, 15000)}`,
      matchResultSchema,
      matchHint,
    );

    return { job, resume, match };
  });

export const generateTailoredResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => generateInput.parse(input))
  .handler(async ({ data }) => {
    const confirmed = data.confirmedExperiences?.length
      ? `\n\nINFORMAÇÕES CONFIRMADAS PELO USUÁRIO (pode usar, sem exagerar):\n${JSON.stringify(data.confirmedExperiences).slice(0, 6000)}`
      : "";
    return callAi(
      WRITER_SYSTEM,
      `Gere a versão direcionada do currículo para a vaga.

VAGA: ${JSON.stringify(data.jobExtraction).slice(0, 10000)}

TEXTO DA VAGA: """${data.jobText.slice(0, 8000)}"""

CURRÍCULO ORIGINAL (estruturado): ${JSON.stringify(data.resumeContent).slice(0, 15000)}

CURRÍCULO ORIGINAL (texto): """${(data.resumeRawText ?? "").slice(0, 10000)}"""${confirmed}`,
      resumeContentSchema,
      resumeHint,
    );
  });

export const rewriteSnippet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => rewriteInput.parse(input))
  .handler(async ({ data }) => {
    const result = await callAi(
      `Você reescreve trechos de currículo preservando integralmente os fatos originais.
Não invente empresas, datas, números, resultados ou competências. Responda em português do Brasil.`,
      `Ação solicitada: ${data.action}.
Vaga alvo: ${data.jobTitle || "não informada"}.
Texto atual: """${data.text}"""`,
      z.object({ suggestion: z.string().min(1) }),
      `{"suggestion":""}`,
    );
    return result;
  });

export const fetchJobFromUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; MatchCV/1.0)" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return { ok: false as const, text: "" };
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, "\n")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
      if (text.length < 400) return { ok: false as const, text: "" };
      return { ok: true as const, text: text.slice(0, 20000) };
    } catch {
      return { ok: false as const, text: "" };
    }
  });
