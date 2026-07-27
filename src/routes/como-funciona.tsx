import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona o MatchCV | Análise de vaga e currículo ATS" },
      {
        name: "description",
        content:
          "Entenda as etapas do MatchCV: adicionar a vaga, enviar o currículo, conferir a análise e gerar a versão ATS direcionada.",
      },
      { property: "og:title", content: "Como funciona o MatchCV" },
      {
        property: "og:description",
        content: "As quatro etapas para gerar um currículo ATS direcionado à vaga, sem cadastro.",
      },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  {
    title: "1. Adicione a vaga",
    text: "Cole o texto completo da oportunidade ou informe o link. O MatchCV tenta preencher automaticamente título, empresa, local, modalidade, senioridade e área — todos editáveis.",
  },
  {
    title: "2. Envie seu currículo",
    text: "Faça upload de PDF, DOCX ou TXT (até 10 MB) ou cole o texto. O conteúdo é organizado em seções e você revisa antes de continuar.",
  },
  {
    title: "3. Confira a análise",
    text: "Você recebe o índice de compatibilidade explicado, requisitos com evidências do seu currículo, palavras-chave, lacunas classificadas e recomendações priorizadas.",
  },
  {
    title: "4. Gere e exporte",
    text: "Crie a versão direcionada, edite seção por seção com pré-visualização em tempo real e exporte em PDF, DOCX ou texto simples.",
  },
];

const FAQ = [
  {
    q: "Preciso criar conta?",
    a: "Não. O MatchCV funciona com uma sessão anônima criada no seu navegador. Nenhum e-mail, senha ou login é solicitado.",
  },
  {
    q: "Onde meus dados ficam guardados?",
    a: "As análises e versões ficam salvas localmente no seu navegador. O texto da vaga e do currículo é enviado ao serviço de IA apenas para gerar a análise.",
  },
  {
    q: "A ferramenta inventa experiências?",
    a: "Não. O currículo gerado usa somente o que está no seu currículo original ou o que você confirmar depois. Quando falta evidência, o item aparece como não identificado.",
  },
  {
    q: "O índice garante contratação?",
    a: "Não. O índice é uma estimativa de compatibilidade e não representa garantia de entrevista ou contratação.",
  },
  {
    q: "Como apago tudo?",
    a: "Use o botão Apagar meus dados na barra superior. Ele limpa sessão, análises, currículos gerados e histórico deste dispositivo.",
  },
];

function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl">Como funciona</h1>
      <p className="mt-3 text-muted-foreground">
        Quatro etapas simples, em português, sem cadastro e sem instalar nada.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <Card key={s.title} className="shadow-card">
            <CardContent className="pt-6">
              <p className="font-semibold">{s.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert className="mt-8">
        <AlertTitle>Aviso importante</AlertTitle>
        <AlertDescription>
          A ferramenta auxilia na adaptação do currículo, mas não deve inventar experiências,
          formações, competências ou resultados que o usuário não possua.
        </AlertDescription>
      </Alert>

      <h2 className="mt-12 text-2xl">Perguntas frequentes</h2>
      <Accordion type="single" collapsible className="mt-4">
        {FAQ.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-10">
        <Button asChild size="lg">
          <Link to="/analise">Analisar uma vaga</Link>
        </Button>
      </div>
    </div>
  );
}
