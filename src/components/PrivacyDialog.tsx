import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PrivacyDialog({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Privacidade dos seus dados</DialogTitle>
          <DialogDescription>Como o MatchCV trata as suas informações.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>Não é necessário criar conta, informar e-mail ou fazer login.</li>
            <li>
              Sua sessão é identificada por um código anônimo gerado no seu navegador, apenas para
              organizar as análises deste dispositivo.
            </li>
            <li>
              O texto da vaga e do currículo é enviado ao serviço de IA somente para gerar a análise
              e o currículo direcionado.
            </li>
            <li>
              As análises, versões e preferências ficam salvas localmente no seu navegador. Ao
              limpar os dados do navegador, elas podem ser removidas.
            </li>
            <li>
              Você pode apagar tudo a qualquer momento no botão <strong>Apagar meus dados</strong>.
            </li>
            <li>
              O conteúdo integral de currículos e vagas não é registrado em relatórios de erro.
            </li>
            <li>
              O serviço auxilia na adaptação do currículo e não garante entrevista ou contratação.
            </li>
            <li>
              O currículo gerado precisa ser revisado por você antes do envio a qualquer empresa.
            </li>
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
