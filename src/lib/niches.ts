import type { ResumeContent } from "./types";

export type Niche = "geral" | "tecnologia" | "engenharia_civil";

export interface NicheInfo {
  id: Niche;
  label: string;
  description: string;
  groups: { name: string; terms: string[] }[];
  tips: string[];
}

export const NICHES: Record<Niche, NicheInfo> = {
  geral: {
    id: "geral",
    label: "Geral",
    description: "Qualquer área profissional.",
    groups: [],
    tips: [],
  },
  tecnologia: {
    id: "tecnologia",
    label: "Tecnologia",
    description: "Desenvolvimento, dados, produto e infraestrutura.",
    groups: [
      {
        name: "Desenvolvimento",
        terms: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C#", ".NET", "APIs REST", "Git", "Testes automatizados", "Microsserviços"],
      },
      {
        name: "Dados",
        terms: ["SQL", "Power BI", "Python", "ETL", "Data Warehouse", "Machine Learning", "Estatística", "Pandas", "Spark", "Análise de dados"],
      },
      {
        name: "Produto",
        terms: ["Product Owner", "Scrum", "Kanban", "Roadmap", "Discovery", "Métricas de produto", "OKR", "User Stories", "UX", "Jira"],
      },
      {
        name: "Infraestrutura",
        terms: ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Linux", "CI/CD", "Terraform", "DevOps", "Monitoramento", "Redes", "Segurança da informação"],
      },
    ],
    tips: [
      "Liste tecnologias com o nome exato usado na vaga (ex.: “Node.js”, não “Node”).",
      "Inclua projetos, repositórios ou portfólio com link.",
      "Mostre impacto técnico: desempenho, escala, redução de custos ou de erros.",
    ],
  },
  engenharia_civil: {
    id: "engenharia_civil",
    label: "Engenharia Civil",
    description: "Obras, projetos, planejamento e gestão.",
    groups: [
      {
        name: "Planejamento e custos",
        terms: ["Planejamento", "Orçamento", "Cronograma", "MS Project", "Controle de custos", "Medição de obras", "Levantamento de quantitativos", "Análise de dados"],
      },
      {
        name: "Gestão",
        terms: ["Gestão de processos", "Gestão de obras", "Gestão de equipes", "Gestão de contratos", "Fornecedores", "Indicadores", "Qualidade", "PBQP-H"],
      },
      {
        name: "Projetos e técnica",
        terms: ["AutoCAD", "Revit", "BIM", "Projetos estruturais", "Normas ABNT", "Compatibilização de projetos", "Fiscalização", "Topografia"],
      },
      {
        name: "Segurança e legislação",
        terms: ["NR-18", "NR-35", "Segurança do trabalho", "Licenciamento", "CREA", "ART"],
      },
    ],
    tips: [
      "Informe porte e tipo das obras (m², unidades, valor do contrato).",
      "Cite softwares (AutoCAD, Revit, MS Project) e normas que você domina.",
      "Mostre resultados em prazo, custo e qualidade (ex.: redução de desperdício).",
    ],
  },
};

export const NICHE_LIST = Object.values(NICHES);

export function nicheLabel(n: string | undefined) {
  return NICHES[(n as Niche) ?? "geral"]?.label ?? "Geral";
}

export function nicheTerms(n: Niche): string[] {
  return Array.from(new Set(NICHES[n].groups.flatMap((g) => g.terms)));
}

export function normalizeText(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function resumeToText(c: ResumeContent): string {
  return [
    c.professionalTitle,
    c.objective,
    c.summary,
    ...c.coreSkills,
    ...c.softSkills,
    ...c.tools,
    ...c.experiences.flatMap((e) => [e.role, e.company, e.context, ...e.bullets]),
    ...c.education.flatMap((e) => [e.degree, e.institution, e.details]),
    ...c.certifications.map((x) => x.name),
    ...c.projects.flatMap((p) => [p.name, p.description]),
    ...c.additionalInfo,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Cobertura (0-100) dos termos da vaga + nicho encontrados em um texto. */
export function keywordCoverage(text: string, terms: string[]): number {
  const list = Array.from(new Set(terms.filter(Boolean)));
  if (!list.length) return 0;
  const norm = normalizeText(text);
  const hit = list.filter((t) => norm.includes(normalizeText(t))).length;
  return Math.round((hit / list.length) * 100);
}
