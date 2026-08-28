# MatchCV Recruiter — Currículo e Entrevista com IA

## O que já existe hoje (será preservado)

- **Análise de vaga + currículo** (`src/routes/analise.tsx`): assistente em 3 passos com colagem da vaga, busca por URL, upload de PDF/DOCX/TXT e extração de texto.
- **Resultado da análise** (`src/routes/resultado.$id.tsx`): índice de compatibilidade explicado, requisitos com evidências, palavras-chave, lacunas, recomendações e currículo ATS com edição, versões e exportação PDF/DOCX/TXT.
- **Biblioteca** (`src/routes/curriculos.tsx`): histórico de análises, busca, backup JSON, exclusão.
- **Infra reutilizável**: `src/lib/storage.ts` (sessão anônima + localStorage), `src/lib/types.ts` (schemas Zod), `src/lib/ai-core.server.ts` + `src/lib/ai.functions.ts` (chamadas seguras à IA no servidor), `src/lib/extract.ts`, `src/lib/resume-export.ts`, `ScoreRing`, `Header`, `PrivacyDialog`, biblioteca shadcn/ui completa.

Nada disso será removido ou recriado.

## Sobre banco de dados e IA

- **IA**: já configurada e funcionando pelo servidor (nenhuma chave no front-end). A entrevista usará o mesmo caminho seguro.
- **Banco de dados**: hoje tudo é salvo no navegador, sem login. O MVP da entrevista seguirá o mesmo modelo (dados só no aparelho do usuário, com exclusão e confirmação). A estrutura de dados já ficará modelada por entidades (currículo, vaga, entrevista, pergunta, resposta, feedback, relatório), pronta para migrar para a nuvem depois — sem alterar autenticação agora.

## O que será construído

### 1. Entidades e armazenamento
Novo módulo `src/lib/interview/` com schemas e store de: **Currículo salvo**, **Vaga salva**, **Entrevista** (config, perguntas, respostas, avaliações, relatório). Vagas e currículos passam a poder ser cadastrados/selecionados de forma independente, aproveitando as análises já existentes como fonte.

### 2. Agente Recrutador (servidor)
Novas funções de servidor em `src/lib/interview/interview.functions.ts` + lógica em `interview-core.server.ts`:
- `startInterview` — apresenta a vaga, explica a simulação e gera a 1ª pergunta.
- `nextQuestion` — gera a próxima pergunta considerando currículo, vaga, senioridade e as respostas anteriores (inclui perguntas de aprofundamento quando a resposta ficar incompleta).
- `evaluateAnswer` — nota de 1 a 5 em cada critério (aderência, clareza, objetividade, organização, exemplos, competências, relação com a vaga, resultados, comunicação, autenticidade), sempre com explicação em texto, além de pontos fortes, o que faltou, estrutura sugerida e exemplo melhorado usando só o que o usuário disse.
- `finalReport` — relatório completo com plano de 3 ações, estudos sugeridos e comparação com simulações anteriores.

Regras no prompt: uma pergunta por vez, sem inventar experiências, sem prometer aprovação, sem qualquer pergunta ou avaliação sobre características pessoais protegidas, tom acolhedor e linguagem simples.

### 3. Telas novas
- `/painel` — Dashboard: currículos, vagas, entrevistas, última simulação, próxima ação recomendada e atalhos.
- `/vagas` — Minhas Vagas: cadastrar nome, empresa, descrição, modalidade e local; selecionar para análise ou entrevista.
- `/meu-curriculo` — importar/colar, visualizar o conteúdo extraído, editar, salvar versões e definir o currículo principal (reaproveita `ResumeEditor` e `ResumePreview`).
- `/entrevista/nova` — Preparação: tipo (RH, comportamental, técnica, gestor, completa — com a opção "Entrevista completa" destacada como recomendada), dificuldade, 5/10/15 perguntas, feedback imediato ou no final, resposta por texto (voz marcada como "em breve") e escolha de vaga + currículo, com resumo do que a IA vai usar.
- `/entrevista/$id` — Sala de Entrevista: conversa profissional com o agente, progresso, uma pergunta por vez, campo de resposta, enviar, encerrar, feedback imediato com os botões "Tentar responder novamente", "Continuar" e "Ver exemplo de estrutura STAR".
- `/entrevista/$id/relatorio` — Relatório final com todos os itens pedidos e os botões de continuidade (refazer, treinar respostas fracas, entrevista com gestor, nova simulação, baixar relatório, voltar para a análise).
- `/evolucao` — Minha Evolução: entrevistas realizadas, vagas, datas, pontos fortes recorrentes, competências a desenvolver, perguntas treinadas e evolução da clareza em visual simples (barras e listas, sem gráficos complexos).

### 4. Integração com o que já existe
Botão **"Treinar entrevista para esta vaga"** na tela de resultado da análise, levando direto à preparação com vaga e currículo pré-selecionados. Navegação do `Header` atualizada para o novo conjunto de telas, mantendo as rotas atuais funcionando.

### 5. Acessibilidade e visual
Paleta azul profundo / azul-claro / branco / verde suave / cinza-claro aplicada aos tokens já existentes, textos maiores, botões grandes, foco visível para teclado, estados de carregando/vazio/erro com mensagens claras, aviso de "conteúdo gerado por IA" e responsividade em celular, tablet e computador.

## Ordem de entrega

1. Entidades + armazenamento de vagas, currículos e entrevistas
2. Minhas Vagas e Meu Currículo
3. Preparação da entrevista
4. Sala de Entrevista (uma pergunta por vez)
5. Avaliação das respostas + feedback imediato
6. Relatório final
7. Histórico / Minha Evolução + Dashboard
