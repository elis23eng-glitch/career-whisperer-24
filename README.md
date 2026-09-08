# MatchCV Recruiter — Currículo e Entrevista com IA

Aplicação web para candidatos que querem entender o que o recrutador realmente procura, adaptar o currículo para sistemas ATS e treinar entrevistas com um agente de IA.

🔗 **Acesse o app publicado:** [https://career-whisperer-24.lovable.app](https://career-whisperer-24.lovable.app)

---

## O que faz

- **Match de currículo e vaga:** cole a descrição da vaga, envie seu currículo (PDF, DOCX, TXT ou texto) e receba um score de compatibilidade, requisitos atendidos, lacunas e palavras-chave estratégicas.
- **Currículo ATS friendly:** gere uma versão direcionada da vaga e exporte em PDF, DOCX ou TXT.
- **Entrevista simulada com IA:** escolha o tipo de entrevista, dificuldade e quantidade de perguntas. Responda por texto, voz ou no modo híbrido.
- **Feedback estruturado:** ao final, receba avaliação por critérios, feedback no método STAR, plano de ação e pontos fortes a destacar.
- **Minha Evolução:** acompanhe seu histórico de entrevistas, notas e progresso ao longo do tempo.
- **Sincronização na nuvem:** vagas, currículos, entrevistas, transcrições de voz e relatórios ficam salvos na sua conta e voltam ao recarregar ou trocar de dispositivo.

---

## Tecnologias

- [TanStack Start](https://tanstack.com/start) — framework full-stack React
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) — estilos utilitários
- [shadcn/ui](https://ui.shadcn.com/) — componentes de interface
- [Lovable Cloud](https://lovable.dev) — backend, banco de dados e autenticação
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — reconhecimento e síntese de voz no navegador
- [AI SDK](https://sdk.vercel.ai/) + gateway de IA da Lovable — geração de análises, perguntas e feedback

---

## Como rodar localmente

> Requisitos: Node.js 20+ e um gerenciador de pacotes (recomendamos `bun` ou `npm`).

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd matchcv-recruiter

# 2. Instale as dependências
bun install
# ou
npm install

# 3. Inicie o servidor de desenvolvimento
bun run dev
# ou
npm run dev
```

O app estará disponível em `http://localhost:8080`.

---

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `bun run dev` | Inicia o servidor de desenvolvimento |
| `bun run build` | Gera a build de produção |
| `bun run build:dev` | Gera a build no modo desenvolvimento |
| `bun run preview` | Visualiza a build de produção localmente |
| `bun run lint` | Executa o ESLint |
| `bun run format` | Formata o código com Prettier |

---

## Estrutura do projeto

```text
src/
├── components/        # Componentes reutilizáveis (UI, layout, auth, resultados)
├── hooks/             # Hooks customizados (auth, mobile)
├── integrations/      # Integrações geradas (Supabase, Lovable)
├── lib/               # Lógica de negócio (IA, entrevista, voz, exportação, storage)
├── routes/            # Rotas do TanStack Start (cada arquivo = uma rota)
├── styles.css         # Tokens de design e configuração do Tailwind
└── start.ts           # Configuração de inicialização do TanStack Start
```

---

## Privacidade e dados

- Nenhuma gravação de áudio é armazenada. Apenas a transcrição confirmada pelo usuário é salva.
- Currículos, vagas e entrevistas ficam vinculados à conta do usuário e protegidos por autenticação.
- A ferramenta auxilia na adaptação do currículo, mas não deve ser usada para inventar experiências, formações ou resultados.

---

## Licença

Este projeto foi construído no [Lovable](https://lovable.dev) e o código pertence ao autor. Uso pessoal e comercial de acordo com os termos da plataforma.

---

Feito com 💙 para quem quer chegar mais preparado à entrevista.
