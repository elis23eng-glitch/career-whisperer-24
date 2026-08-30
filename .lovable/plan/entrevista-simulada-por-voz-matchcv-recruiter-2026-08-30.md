# Entrevista simulada por voz — MatchCV Recruiter

## O que já existe (será reaproveitado, não recriado)

- **Preparação** (`src/routes/entrevista.nova.tsx`): escolha de vaga, currículo, tipo, dificuldade, quantidade de perguntas e modo de feedback.
- **Sala de Entrevista** (`src/routes/entrevista.$id.tsx`): uma pergunta por vez, campo de resposta em texto, avaliação por resposta, tentar novamente, encerrar.
- **Relatório** (`src/routes/entrevista.$id.relatorio.tsx`) e **Minha Evolução** (`src/routes/evolucao.tsx`).
- **Agente Recrutador na IA** (`src/lib/interview/interview-core.server.ts` + `interview.functions.ts`): abertura, próxima pergunta, avaliação por 10 critérios com STAR, relatório final. Já roda no servidor, sem chave no front-end.
- **Dados** (`src/lib/interview/schemas.ts` + `store.ts`): vagas, currículos e entrevistas salvos no próprio aparelho (sem login, sem banco na nuvem hoje).

Nada disso muda de comportamento: a entrevista por texto continua exatamente como está.

## Tecnologia de voz do MVP

- **Fala do recrutador**: síntese de voz do próprio navegador (Web Speech `speechSynthesis`), com voz pt-BR ou en-US, ritmo moderado, controles de ouvir/repetir/parar e volume.
- **Resposta do candidato**: reconhecimento de voz do navegador (`SpeechRecognition` / `webkitSpeechRecognition`), com transcrição em tempo quase real.
- **Limitações honestas**: funciona bem em Chrome, Edge e Android; Safari/iOS tem suporte parcial e Firefox não tem reconhecimento. Onde não houver suporte, a tela mostra a mensagem "O recurso de voz não está disponível neste navegador. Você pode continuar a entrevista digitando suas respostas." e o modo texto assume — sem simular a funcionalidade.
- Nenhum áudio é enviado para servidor nem armazenado; só a transcrição confirmada é salva.

## O que será construído

### 1. Serviços de voz isolados
`src/lib/voice/speech.ts` (leitura das perguntas) e `src/lib/voice/recognition.ts` (captura e transcrição), mais `useMicPermission`. A lógica da entrevista continua independente da tecnologia de voz.

### 2. Configuração (tela de preparação)
Novos campos: **modo de resposta** (texto / voz / híbrido — híbrido é o padrão, "fale ou digite sua resposta") e **idioma** (Português do Brasil padrão, ou Inglês). Um passo de checagem antes de começar: vaga, empresa, tipo, quantidade, idioma, indicador de permissão do microfone, "Testar microfone", "Ouvir voz do recrutador", orientação de ambiente silencioso, aviso de que a transcrição pode ser corrigida e "Começar entrevista". O microfone só é solicitado ao clicar em testar ou começar.

### 3. Sala de entrevista com voz
Pergunta sempre escrita na tela e lida em voz alta; o microfone só é liberado após o fim da leitura. Controles com rótulo em texto: Ouvir pergunta, Repetir pergunta, Começar a responder, Pausar, Continuar, Finalizar resposta, Descartar e gravar novamente, Editar transcrição, Enviar resposta, Responder digitando, Encerrar entrevista. Botão de microfone grande, com estado visual, "Ouvindo sua resposta...", cronômetro e animação discreta de áudio (nunca ativo sem indicação visual).

Estados tratados com mensagens simples: sem permissão, permitido, microfone indisponível, aguardando, gravando, pausado, processando fala, transcrição pronta, gerando avaliação, reproduzindo pergunta, concluída, erro de conexão. Também: silêncio prolongado, perda de permissão, duas gravações simultâneas bloqueadas, texto preservado em falha temporária e encerramento da captura ao sair da página.

### 4. Confirmação da transcrição
A transcrição cai num campo editável com a pergunta "Esta transcrição representa corretamente sua resposta?" e as opções Confirmar e enviar / Editar resposta / Gravar novamente. Nada é avaliado sem confirmação, e a resposta falada nunca é substituída por texto criado pela IA.

### 5. Feedback
Mesmo fluxo de avaliação de hoje (aderência, clareza, objetividade, organização, exemplos, relação com a vaga, evidências, STAR, comunicação, consistência com o currículo), com um botão para **ouvir um resumo curto do feedback**. Falas do recrutador ficam curtas; o detalhe permanece por escrito. Nada de avaliar voz, sotaque, timbre ou características pessoais — regra reforçada no prompt.

### 6. Inglês
Perguntas faladas e escritas em inglês, repetição de áudio, transcrição em inglês, correções educativas focadas em compreensão (nunca sotaque), sugestão de resposta melhorada, tradução da pergunta apenas sob pedido e botão "Ver ajuda de vocabulário".

### 7. Dados e relatório
Cada resposta guarda: entrevista, pergunta, texto confirmado, origem (voz ou texto), idioma, duração aproximada, data/hora, feedback e critérios. Sem áudio salvo. O relatório ganha modo utilizado, idioma, tempo médio das respostas, perguntas que o usuário pediu para repetir, e os botões "Treinar novamente por voz", "Treinar apenas respostas fracas" e "Praticar entrevista em inglês".

### 8. Privacidade e acessibilidade
Aviso explícito "O áudio é utilizado somente para gerar a transcrição. Por padrão, a gravação não é armazenada.", captura encerrada ao sair, exclusão de transcrições no histórico, tudo disponível em texto, legendas durante a leitura, controle de volume, parar áudio, botões com rótulo, navegação por teclado, contraste adequado, gravação sinalizada além da cor e opção de reduzir animações.

## Ordem de entrega

1. Serviços de voz + permissão e teste de microfone
2. Leitura das perguntas em voz
3. Captura da resposta e transcrição editável
4. Confirmação antes da avaliação
5. Integração com o fluxo atual (híbrido, texto intacto)
6. Feedback falado e escrito
7. Relatório final com os novos dados e botões
8. Testes dos cenários pedidos (permissão negada, sem suporte, silêncio, pausa, edição, troca voz/texto, pt-BR e inglês, celular, saída da página)
