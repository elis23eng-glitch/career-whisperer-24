import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { z } from "zod";
import {
  ANALYST_SYSTEM,
  JOB_HINT,
  MATCH_HINT,
  MODEL,
  RESUME_HINT,
  REWRITER_SYSTEM,
  WRITER_SYSTEM,
  suggestionSchema,
} from "./ai-schemas";
import { jobExtractionSchema, matchResultSchema, resumeContentSchema } from "./types";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Serviço de IA indisponível no momento.");
  return createOpenAICompatible({
    name: "lovable-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key },
    includeUsage: true,
    supportsStructuredOutputs: true,
  });
}

function parseJson(raw: string) {
  const cleaned = raw
    .replace(/```(?:json)?/g, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta sem JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callAi<T>(
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  hint: string,
): Promise<T> {
  const provider = gateway();
  const run = async (extra: string) => {
    const res = await generateText({
      model: provider(MODEL),
      system,
      prompt: `${prompt}\n\nRetorne SOMENTE um JSON válido com esta forma:\n${hint}${extra}`,
    });
    return res.text ?? "";
  };

  try {
    return schema.parse(parseJson(await run("")));
  } catch (first) {
    try {
      const retry = await run(
        "\n\nATENÇÃO: a resposta anterior não era um JSON válido conforme o schema. Retorne apenas JSON válido, sem comentários e sem texto adicional.",
      );
      return schema.parse(parseJson(retry));
    } catch {
      const detail = first instanceof Error ? first.message : "erro desconhecido";
      throw new Error(`A resposta da IA não pôde ser validada. Detalhe técnico: ${detail}`);
    }
  }
}

export async function runAnalysis(data: { jobText: string; resumeText: string }) {
  const job = await callAi(
    ANALYST_SYSTEM,
    `Extraia os dados estruturados desta descrição de vaga. Se um campo não estiver presente, deixe vazio.\n\nDESCRIÇÃO DA VAGA:\n"""${data.jobText.slice(0, 20000)}"""`,
    jobExtractionSchema,
    JOB_HINT,
  );

  const resume = await callAi(
    ANALYST_SYSTEM,
    `Organize o texto do currículo abaixo nas seções do schema. Nunca invente dados: se algo não existir, deixe vazio.\n\nCURRÍCULO:\n"""${data.resumeText.slice(0, 25000)}"""`,
    resumeContentSchema,
    RESUME_HINT,
  );

  const match = await callAi(
    ANALYST_SYSTEM,
    `Compare a vaga e o currículo abaixo.
Calcule um índice geral de 0 a 100 com esta ponderação: experiência 25%, competências técnicas 25%,
responsabilidades semelhantes 20%, formação e certificações 10%, palavras-chave 10%,
competências comportamentais 5%, localização/modalidade/disponibilidade 5%.
Cada valor de categoryScores vai de 0 a 100. Explique o score em 2 ou 3 frases (scoreExplanation).
Avalie também o currículo atual quanto à leitura por sistemas ATS (atsScore de 0 a 100 e atsChecklist com os itens:
títulos de seções reconhecíveis, dados de contato legíveis, ordem cronológica, uso de palavras-chave,
ausência de tabelas complexas, ausência de imagens, ausência de colunas múltiplas, consistência de datas,
tamanho adequado, bullets objetivos, ortografia, compatibilidade com a vaga).
Liste no evidenceMap todos os requisitos obrigatórios e desejáveis com a evidência literal do currículo.

VAGA (estruturada): ${JSON.stringify(job).slice(0, 12000)}

VAGA (texto): """${data.jobText.slice(0, 12000)}"""

CURRÍCULO (estruturado): ${JSON.stringify(resume).slice(0, 15000)}`,
    matchResultSchema,
    MATCH_HINT,
  );

  return { job, resume, match };
}

export async function runGenerate(data: {
  jobText: string;
  jobExtraction: unknown;
  resumeContent: unknown;
  resumeRawText: string;
  confirmedExperiences: unknown[];
}) {
  const confirmed = data.confirmedExperiences?.length
    ? `\n\nINFORMAÇÕES CONFIRMADAS PELO USUÁRIO (pode usar, sem exagerar):\n${JSON.stringify(
        data.confirmedExperiences,
      ).slice(0, 6000)}`
    : "";
  return callAi(
    WRITER_SYSTEM,
    `Gere a versão direcionada do currículo para a vaga.

VAGA: ${JSON.stringify(data.jobExtraction).slice(0, 10000)}

TEXTO DA VAGA: """${data.jobText.slice(0, 8000)}"""

CURRÍCULO ORIGINAL (estruturado): ${JSON.stringify(data.resumeContent).slice(0, 15000)}

CURRÍCULO ORIGINAL (texto): """${(data.resumeRawText ?? "").slice(0, 10000)}"""${confirmed}`,
    resumeContentSchema,
    RESUME_HINT,
  );
}

export async function runRewrite(data: { text: string; action: string; jobTitle: string }) {
  return callAi(
    REWRITER_SYSTEM,
    `Ação solicitada: ${data.action}.
Vaga alvo: ${data.jobTitle || "não informada"}.
Texto atual: """${data.text}"""`,
    suggestionSchema,
    `{"suggestion":""}`,
  );
}

export async function runFetchUrl(url: string) {
  try {
    const res = await fetch(url, {
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
}
