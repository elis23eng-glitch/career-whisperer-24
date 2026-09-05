import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MatchCV | Currículo ATS e Match de Vagas" },
      {
        name: "description",
        content:
          "Compare seu currículo com uma vaga, descubra palavras-chave e gere uma versão ATS direcionada. Sem cadastro.",
      },
      { property: "og:title", content: "MatchCV | Currículo ATS e Match de Vagas" },
      {
        property: "og:description",
        content:
          "Analise a vaga, encontre lacunas e gere um currículo ATS direcionado em poucos minutos.",
      },
    ],
  }),
  component: Home,
});

const BENEFITS = [
  {
    icon: Target,
    title: "Match inteligente",
    text: "Compare vaga e currículo de forma estruturada.",
  },
  {
    icon: FileCheck2,
    title: "Currículo ATS Friendly",
    text: "Gere uma versão simples, objetiva e compatível com sistemas de recrutamento.",
  },
  {
    icon: KeyRound,
    title: "Palavras-chave estratégicas",
    text: "Descubra termos importantes presentes na descrição da vaga.",
  },
  {
    icon: ShieldCheck,
    title: "Tudo salvo na sua conta",
    text: "Entrevistas, respostas e relatórios ficam guardados com segurança.",
  },

];

const STEPS = [
  { title: "Adicione a vaga", text: "Cole a descrição completa ou informe o link da oportunidade." },
  { title: "Envie seu currículo", text: "Faça upload de PDF, DOCX, TXT ou cole o texto." },
  { title: "Confira a análise", text: "Veja score, requisitos, evidências, palavras-chave e lacunas." },
  { title: "Gere e exporte", text: "Crie a versão direcionada e exporte em PDF, DOCX ou texto." },
];

function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <Badge variant="secondary" className="mb-4 gap-1">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Suas entrevistas sempre salvas
            </Badge>
            <h1 className="text-4xl leading-tight sm:text-5xl">
              Encontre o melhor match entre seu currículo e a vaga.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Analise oportunidades, descubra o que o recrutador procura e gere um currículo ATS
              direcionado em poucos minutos.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/analise">
                  Analisar uma vaga
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/como-funciona">Ver como funciona</Link>
              </Button>
            </div>
          </div>

          <div aria-hidden="true" className="relative">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Analista de Dados Pleno</p>
                  <p className="text-xs text-muted-foreground">Compatibilidade estimada</p>
                </div>
                <span className="rounded-full bg-success px-3 py-1 text-xs font-bold text-success-foreground">
                  78%
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Experiência profissional", "82%", "bg-primary"],
                  ["Competências técnicas", "74%", "bg-brand"],
                  ["Palavras-chave", "61%", "bg-highlight"],
                ].map(([label, value, color]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-medium">
                      <span>{label}</span>
                      <span className="tabular-nums text-muted-foreground">{value}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: value }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  ["Requisitos", "12"],
                  ["Atendidos", "8"],
                  ["Lacunas", "3"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border bg-secondary p-3">
                    <p className="text-lg font-extrabold">{v}</p>
                    <p className="text-muted-foreground">{k}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -right-4 hidden rounded-xl border bg-highlight-soft px-4 py-3 text-sm font-semibold shadow-soft sm:block">
              <BadgeCheck className="mr-1 inline size-4" aria-hidden="true" />
              Currículo ATS pronto para envio
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl sm:text-3xl">Por que usar o MatchCV</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="shadow-card">
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="mt-3 text-base">{title}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl sm:text-3xl">Como funciona</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full shadow-card">
                  <CardContent className="pt-6">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="mt-3 font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>

          <Alert className="mt-8">
            <AlertTitle>Uso responsável</AlertTitle>
            <AlertDescription>
              A ferramenta auxilia na adaptação do currículo, mas não deve inventar experiências,
              formações, competências ou resultados que o usuário não possua.
            </AlertDescription>
          </Alert>

          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/analise">
                Começar agora
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
