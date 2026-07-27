import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { MatchResult } from "@/lib/types";

const SEVERITY_LABEL: Record<string, string> = {
  critica: "Crítica",
  relevante: "Relevante",
  moderada: "Moderada",
  pequena: "Pequena",
};

const SEVERITY_CLASS: Record<string, string> = {
  critica: "bg-destructive text-destructive-foreground",
  relevante: "bg-warning text-warning-foreground",
  moderada: "bg-highlight text-highlight-foreground",
  pequena: "bg-secondary text-secondary-foreground",
};

const CATEGORY_LABEL: Record<string, string> = {
  redacao: "Pode melhorar com redação",
  experiencia: "Depende de experiência real",
  certificacao: "Depende de curso ou certificação",
  nao_corrigivel: "Não se resolve apenas pelo currículo",
};

export function GapsTab({ match }: { match: MatchResult }) {
  const order = ["critica", "relevante", "moderada", "pequena"];
  const groups = order
    .map((sev) => ({ sev, items: match.gaps.filter((g) => g.severity === sev) }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhuma lacuna relevante foi identificada nesta comparação.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.sev}>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            Lacunas de criticidade
            <Badge className={SEVERITY_CLASS[group.sev]}>{SEVERITY_LABEL[group.sev]}</Badge>
          </h3>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {group.items.map((gap, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-base">{gap.title}</CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {CATEGORY_LABEL[gap.category]}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {gap.impact ? (
                    <p>
                      <strong>Impacto estimado:</strong> {gap.impact}
                    </p>
                  ) : null}
                  {gap.reason ? (
                    <p>
                      <strong>Motivo:</strong> {gap.reason}
                    </p>
                  ) : null}
                  {gap.howToImprove ? (
                    <p>
                      <strong>Como melhorar:</strong> {gap.howToImprove}
                    </p>
                  ) : null}
                  {gap.compensation ? (
                    <p>
                      <strong>Possível compensação:</strong> {gap.compensation}
                    </p>
                  ) : null}
                  {gap.question ? (
                    <>
                      <Separator />
                      <p className="text-muted-foreground">
                        <strong>Para confirmar:</strong> {gap.question}
                      </p>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function RecommendationsTab({
  match,
  applied,
  onApply,
  onIgnore,
}: {
  match: MatchResult;
  applied: Record<number, "aplicada" | "ignorada">;
  onApply: (index: number) => void;
  onIgnore: (index: number) => void;
}) {
  const groups = [
    { key: "alta", title: "Alta prioridade" },
    { key: "media", title: "Média prioridade" },
    { key: "baixa", title: "Baixa prioridade" },
  ] as const;

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const items = match.recommendations
          .map((r, index) => ({ r, index }))
          .filter(({ r }) => r.priority === group.key);
        if (items.length === 0) return null;
        return (
          <section key={group.key}>
            <h3 className="text-lg font-semibold">{group.title}</h3>
            <div className="mt-3 space-y-3">
              {items.map(({ r, index }) => (
                <Card key={index}>
                  <CardContent className="space-y-3 pt-6 text-sm">
                    <p className="font-semibold">{r.whatToChange}</p>
                    {r.why ? <p className="text-muted-foreground">{r.why}</p> : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {r.currentExample ? (
                        <div className="rounded-lg border bg-muted p-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            Exemplo atual
                          </p>
                          <p className="mt-1">{r.currentExample}</p>
                        </div>
                      ) : null}
                      {r.suggestedExample ? (
                        <div className="rounded-lg border bg-accent p-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            Exemplo sugerido
                          </p>
                          <p className="mt-1">{r.suggestedExample}</p>
                        </div>
                      ) : null}
                    </div>
                    {applied[index] ? (
                      <Badge variant={applied[index] === "aplicada" ? "default" : "secondary"}>
                        {applied[index] === "aplicada"
                          ? "Marcada como aplicada"
                          : "Recomendação ignorada"}
                      </Badge>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => onApply(index)}>
                          Aplicar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onIgnore(index)}>
                          Ignorar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
      {match.recommendations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma recomendação foi gerada para esta análise.
        </p>
      ) : null}
    </div>
  );
}
