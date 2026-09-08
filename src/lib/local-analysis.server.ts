/**
 * Análise local (sem IA paga).
 * Usada automaticamente quando o serviço de IA não está disponível,
 * para que o candidato nunca fique sem resultado.
 */
import type { JobExtraction, MatchResultData, ResumeContent } from "./types";

const STOPWORDS = new Set(
  `a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre entre e ou mas que se ao aos à às pelo pela pelos pelas
  é são ser estar tem ter há mais menos muito muita muitos muitas todo toda todos todas seu sua seus suas nosso nossa este esta esse essa aquele aquela
  como quando onde qual quais quem cujo já não sim também apenas cada outro outra outros outras vaga empresa candidato candidatos area área nivel nível
  trabalho profissional profissionais atividades atividade requisitos requisito desejavel desejável obrigatorio obrigatório conhecimento conhecimentos
  experiencia experiência experiencias experiências habilidade habilidades competencia competência competencias competências responsabilidades
  ainda apos após ate até desde durante pois porque assim entao então ser sera será seja pode podem deve devem`
    .split(/\s+/)
    .filter(Boolean),
);

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(value: string) {
  return stripAccents(value.toLowerCase());
}

function tokens(text: string) {
  return normalize(text)
    .replace(/[^a-z0-9+#./ ]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[./]+|[./]+$/g, ""))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function lines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-*–—>·]+/, "").trim())
    .filter(Boolean);
}

function topTerms(text: string, limit: number) {
  const counts = new Map<string, number>();
  for (const t of tokens(text)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

/* ------------------------------- Vaga ------------------------------------- */

const MANDATORY_HINT = /(obrigat|necess|imprescind|exig|requisito|é preciso|precisa)/i;
const DESIRABLE_HINT = /(desej|diferencial|ser[aá] um plus|valorizado)/i;
const RESP_HINT = /(atuar|realizar|executar|responsáv|acompanhar|apoiar|garantir|elaborar|gerenciar|atender)/i;

function guessWorkModel(text: string): JobExtraction["workModel"] {
  const t = normalize(text);
  if (/hibrid/.test(t)) return "hibrido";
  if (/remoto|home ?office|anywhere/.test(t)) return "remoto";
  if (/presencial/.test(t)) return "presencial";
  return "nao_identificado";
}

function guessSeniority(text: string) {
  const t = normalize(text);
  if (/estagi/.test(t)) return "Estágio";
  if (/\bjunior\b|\bjr\b|\bi\b junior/.test(t)) return "Júnior";
  if (/\bpleno\b|\bpl\b/.test(t)) return "Pleno";
  if (/\bsenior\b|\bsr\b/.test(t)) return "Sênior";
  if (/especialista|coordenador|gerente|lider|líder/.test(t)) return "Especialista/Liderança";
  return "";
}

export function localJobExtraction(jobText: string): JobExtraction {
  const ls = lines(jobText);
  const title = (ls[0] ?? "").slice(0, 120);
  const companyLine = ls.find((l) => /empresa|contratante|companhia/i.test(l)) ?? "";
  const locationLine =
    ls.find((l) => /(^|\s)(local|localiza|cidade)/i.test(l) || /-\s?[A-Z]{2}\b/.test(l)) ?? "";

  const requirements = ls
    .filter((l) => l.length > 12 && (MANDATORY_HINT.test(l) || DESIRABLE_HINT.test(l)))
    .slice(0, 25)
    .map((text) => ({
      text: text.slice(0, 220),
      type: (DESIRABLE_HINT.test(text) ? "desejavel" : "obrigatorio") as
        | "obrigatorio"
        | "desejavel",
      category: "outro" as const,
    }));

  const responsibilities = ls
    .filter((l) => l.length > 12 && RESP_HINT.test(l))
    .slice(0, 20)
    .map((l) => l.slice(0, 220));

  const terms = topTerms(jobText, 25);
  const max = terms[0]?.count ?? 1;
  const keywords = terms.map(({ term, count }) => ({
    term,
    importance: (count >= max * 0.6
      ? "essencial"
      : count >= max * 0.3
        ? "importante"
        : "complementar") as "essencial" | "importante" | "complementar",
  }));

  return {
    jobTitle: title,
    company: companyLine.replace(/^.*?:\s*/, "").slice(0, 80),
    location: locationLine.slice(0, 80),
    workModel: guessWorkModel(jobText),
    seniority: guessSeniority(jobText),
    area: "",
    language: "pt-BR",
    requirements,
    responsibilities,
    keywords,
    softSkills: [],
  };
}

/* ----------------------------- Currículo ---------------------------------- */

const SECTIONS: Record<string, RegExp> = {
  summary: /^(resumo|perfil|sobre mim|apresenta)/i,
  objective: /^(objetivo)/i,
  experiences: /^(experi|hist[oó]rico profissional|atua)/i,
  education: /^(forma|escolaridade|educa|acad)/i,
  certifications: /^(certifica|cursos|qualifica)/i,
  skills: /^(compet|habilidades|conhecimentos|skills|t[eé]cnic)/i,
  languages: /^(idiomas)/i,
};

export function localResumeContent(resumeText: string): ResumeContent {
  const ls = lines(resumeText);
  const email = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(resumeText)?.[0] ?? "";
  const phone = /(\(?\d{2}\)?\s?)?9?\d{4}[-.\s]?\d{4}/.exec(resumeText)?.[0] ?? "";
  const linkedin = /(https?:\/\/)?(www\.)?linkedin\.com\/[^\s,;]+/i.exec(resumeText)?.[0] ?? "";

  const buckets: Record<string, string[]> = {};
  let current = "";
  for (const line of ls) {
    const match = Object.entries(SECTIONS).find(([, re]) => re.test(line) && line.length < 60);
    if (match) {
      current = match[0];
      buckets[current] = buckets[current] ?? [];
      continue;
    }
    if (current) (buckets[current] = buckets[current] ?? []).push(line);
  }

  const nameLine = ls.find((l) => /^[A-ZÀ-Ý][\p{L}'´`\- ]{5,60}$/u.test(l)) ?? ls[0] ?? "";

  const experiences = (buckets["experiences"] ?? []).reduce<ResumeContent["experiences"]>(
    (acc, line) => {
      const isHeader = /\d{4}/.test(line) || / (na|no|em|@|-) /i.test(line);
      if (isHeader && line.length < 140) {
        acc.push({
          role: line.split(/[-–|@]/)[0]?.trim() ?? line,
          company: line.split(/[-–|@]/)[1]?.trim() ?? "",
          location: "",
          period: /(\d{2}\/\d{4}|\d{4})\s?[-–a até]{1,4}\s?(\d{2}\/\d{4}|\d{4}|atual)/i.exec(
            line,
          )?.[0] ?? "",
          context: "",
          bullets: [],
        });
      } else if (acc.length) {
        acc[acc.length - 1]!.bullets.push(line.slice(0, 300));
      }
      return acc;
    },
    [],
  );

  const skills = (buckets["skills"] ?? [])
    .flatMap((l) => l.split(/[;,•|]/))
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 60)
    .slice(0, 30);

  return {
    fullName: nameLine.slice(0, 80),
    professionalTitle: "",
    location: "",
    contacts: { email, phone, linkedin, portfolio: "" },
    objective: (buckets["objective"] ?? []).join(" ").slice(0, 400),
    summary: (buckets["summary"] ?? []).join(" ").slice(0, 800),
    coreSkills: skills,
    softSkills: [],
    experiences,
    education: (buckets["education"] ?? []).slice(0, 10).map((l) => ({
      degree: l.slice(0, 120),
      institution: "",
      period: /\d{4}/.exec(l)?.[0] ?? "",
      details: "",
    })),
    certifications: (buckets["certifications"] ?? []).slice(0, 15).map((l) => ({
      name: l.slice(0, 120),
      issuer: "",
      year: /\d{4}/.exec(l)?.[0] ?? "",
    })),
    languages: (buckets["languages"] ?? []).slice(0, 6).map((l) => ({
      name: l.split(/[-–:]/)[0]?.trim() ?? l,
      level: l.split(/[-–:]/)[1]?.trim() ?? "",
    })),
    tools: [],
    projects: [],
    additionalInfo: [],
  };
}

/* ------------------------------ Comparação -------------------------------- */

export function localMatch(
  job: JobExtraction,
  resumeText: string,
  resume: ResumeContent,
): MatchResultData {
  const resumeNorm = normalize(resumeText);
  const has = (term: string) => resumeNorm.includes(normalize(term));

  const evidenceFor = (term: string) => {
    const target = normalize(term);
    const found = lines(resumeText).find((l) => normalize(l).includes(target));
    return found ? found.slice(0, 220) : "";
  };

  const keywordsFound = job.keywords
    .filter((k) => has(k.term))
    .map((k) => ({
      term: k.term,
      strength: (k.importance === "essencial" ? "forte" : "fraca") as "forte" | "fraca",
      evidence: evidenceFor(k.term),
    }));

  const keywordsMissing = job.keywords
    .filter((k) => !has(k.term))
    .map((k) => ({
      term: k.term,
      importance: k.importance,
      why: "Termo aparece na descrição da vaga e não foi localizado no currículo.",
    }));

  const evidenceMap = job.requirements.map((r) => {
    const words = tokens(r.text).filter((w) => w.length > 3);
    const hits = words.filter((w) => resumeNorm.includes(w));
    const ratio = words.length ? hits.length / words.length : 0;
    const adherence = ratio >= 0.6 ? "atendido" : ratio >= 0.3 ? "parcial" : "nao_identificado";
    return {
      requirement: r.text,
      type: r.type,
      priority: (r.type === "obrigatorio" ? "alta" : "media") as "alta" | "media" | "baixa",
      evidence: hits.length ? evidenceFor(hits[0]!) : "",
      adherence: adherence as "atendido" | "parcial" | "nao_identificado",
      recommendation:
        adherence === "atendido"
          ? "Mantenha esse ponto em destaque no currículo."
          : "Se você tem essa experiência, descreva-a com um exemplo concreto no currículo.",
    };
  });

  const keywordScore = pct(keywordsFound.length, job.keywords.length || 1);
  const mandatory = evidenceMap.filter((e) => e.type === "obrigatorio");
  const mandatoryScore = pct(
    mandatory.filter((e) => e.adherence === "atendido").length +
      mandatory.filter((e) => e.adherence === "parcial").length * 0.5,
    mandatory.length || 1,
  );
  const respWords = job.responsibilities.flatMap((r) => tokens(r));
  const respScore = pct(respWords.filter((w) => resumeNorm.includes(w)).length, respWords.length || 1);
  const experienceScore = Math.min(100, resume.experiences.length * 25 + (respScore ? 20 : 0));
  const educationScore = resume.education.length ? 80 : 40;
  const behavioralScore = 60;
  const logisticsScore = job.location && has(job.location) ? 90 : 60;

  const overall = Math.round(
    experienceScore * 0.25 +
      mandatoryScore * 0.25 +
      respScore * 0.2 +
      educationScore * 0.1 +
      keywordScore * 0.1 +
      behavioralScore * 0.05 +
      logisticsScore * 0.05,
  );

  const atsChecklist = [
    {
      item: "Dados de contato legíveis",
      status: (resume.contacts.email ? "ok" : "atencao") as "ok" | "atencao" | "falha",
      note: resume.contacts.email ? "E-mail identificado." : "Não localizamos um e-mail.",
    },
    {
      item: "Seções reconhecíveis",
      status: (resume.experiences.length ? "ok" : "atencao") as "ok" | "atencao" | "falha",
      note: resume.experiences.length
        ? "Seção de experiências identificada."
        : "Use títulos como 'Experiência profissional' e 'Formação'.",
    },
    {
      item: "Palavras-chave da vaga",
      status: (keywordScore >= 50 ? "ok" : "atencao") as "ok" | "atencao" | "falha",
      note: `${keywordsFound.length} de ${job.keywords.length} termos localizados.`,
    },
    {
      item: "Tamanho adequado",
      status: (resumeText.length > 800 ? "ok" : "atencao") as "ok" | "atencao" | "falha",
      note: resumeText.length > 800 ? "Conteúdo suficiente." : "Currículo muito curto.",
    },
  ];

  const atsScore = Math.round(
    (atsChecklist.filter((c) => c.status === "ok").length / atsChecklist.length) * 100,
  );

  return {
    overallScore: overall,
    atsScore,
    scoreExplanation:
      "Comparação automática feita no próprio aplicativo, cruzando os termos e requisitos da vaga com o texto do seu currículo. É uma leitura objetiva de palavras e requisitos, sem interpretação de contexto.",
    categoryScores: {
      experiencia: experienceScore,
      tecnicas: mandatoryScore,
      responsabilidades: respScore,
      formacao: educationScore,
      palavrasChave: keywordScore,
      comportamentais: behavioralScore,
      logistica: logisticsScore,
    },
    overview: `Foram localizados ${keywordsFound.length} de ${job.keywords.length} termos importantes da vaga no seu currículo, e ${
      mandatory.filter((e) => e.adherence === "atendido").length
    } de ${mandatory.length} requisitos obrigatórios com evidência clara.`,
    strengths: keywordsFound.slice(0, 6).map((k) => `Seu currículo já menciona "${k.term}".`),
    attentionPoints: keywordsMissing
      .filter((k) => k.importance === "essencial")
      .slice(0, 6)
      .map((k) => `O termo "${k.term}" é central na vaga e não aparece no currículo.`),
    improvementOpportunities: keywordsMissing
      .slice(0, 8)
      .map((k) => `Se você tem prática com "${k.term}", inclua um exemplo real no currículo.`),
    transferableSkills: [],
    qualitativeFit:
      "Análise objetiva por comparação de termos. Para uma leitura mais aprofundada, refaça a análise quando o assistente inteligente estiver disponível.",
    evidenceMap,
    keywordsFound,
    keywordsMissing,
    gaps: keywordsMissing
      .filter((k) => k.importance !== "complementar")
      .slice(0, 6)
      .map((k) => ({
        title: `Sem evidência de "${k.term}"`,
        severity: (k.importance === "essencial" ? "relevante" : "moderada") as
          | "critica"
          | "relevante"
          | "moderada"
          | "pequena",
        category: "redacao" as const,
        impact: "Sistemas de triagem podem não encontrar esse termo no seu currículo.",
        reason: "O termo aparece na vaga, mas não no texto enviado.",
        howToImprove: "Descreva onde e como você usou isso, com um exemplo concreto.",
        compensation: "",
        question: `Você já trabalhou com ${k.term}? Em que situação?`,
      })),
    recommendations: keywordsMissing.slice(0, 5).map((k) => ({
      priority: (k.importance === "essencial" ? "alta" : "media") as "alta" | "media" | "baixa",
      whatToChange: `Incluir "${k.term}" em uma experiência real`,
      why: "Aumenta a chance de o currículo ser encontrado na triagem automática.",
      currentExample: "",
      suggestedExample: `Atuei com ${k.term} em ... , obtendo ... .`,
    })),
    atsChecklist,
  };
}

export function localAnalysis(data: { jobText: string; resumeText: string }) {
  const job = localJobExtraction(data.jobText);
  const resume = localResumeContent(data.resumeText);
  const match = localMatch(job, data.resumeText, resume);
  return { job, resume, match };
}

export function localTailoredResume(
  resume: ResumeContent,
  job: JobExtraction,
  resumeRawText: string,
): ResumeContent {
  const base = resume.fullName ? resume : localResumeContent(resumeRawText);
  const jobTerms = job.keywords.slice(0, 12).map((k) => k.term);
  const extra = jobTerms.filter(
    (t) => !base.coreSkills.some((s) => normalize(s).includes(normalize(t))),
  );
  return {
    ...base,
    professionalTitle: base.professionalTitle || job.jobTitle,
    objective: base.objective || `Atuar como ${job.jobTitle}.`,
    summary:
      base.summary ||
      `Profissional com experiência em ${base.coreSkills.slice(0, 5).join(", ") || "sua área de atuação"}.`,
    coreSkills: [...base.coreSkills, ...extra].slice(0, 30),
  };
}
