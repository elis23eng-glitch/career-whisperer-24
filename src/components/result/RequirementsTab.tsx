import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MatchResult } from "@/lib/types";

type Filter = "todos" | "atendidos" | "parciais" | "nao" | "obrigatorios" | "desejaveis";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "atendidos", label: "Atendidos" },
  { key: "parciais", label: "Parciais" },
  { key: "nao", label: "Não identificados" },
  { key: "obrigatorios", label: "Obrigatórios" },
  { key: "desejaveis", label: "Desejáveis" },
];

export function adherenceBadge(adherence: string) {
  if (adherence === "atendido")
    return (
      <Badge className="bg-success text-success-foreground">
        <span aria-hidden="true">✓</span> Atendido
      </Badge>
    );
  if (adherence === "parcial")
    return (
      <Badge className="bg-highlight text-highlight-foreground">
        <span aria-hidden="true">~</span> Parcial
      </Badge>
    );
  return (
    <Badge variant="outline">
      <span aria-hidden="true">!</span> Não identificado
    </Badge>
  );
}

export function RequirementsTab({ match }: { match: MatchResult }) {
  const [filter, setFilter] = useState<Filter>("todos");

  const rows = match.evidenceMap.filter((r) => {
    switch (filter) {
      case "atendidos":
        return r.adherence === "atendido";
      case "parciais":
        return r.adherence === "parcial";
      case "nao":
        return r.adherence === "nao_identificado";
      case "obrigatorios":
        return r.type === "obrigatorio";
      case "desejaveis":
        return r.type === "desejavel";
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum requisito neste filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-52">Requisito</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="min-w-56">Evidência no currículo</TableHead>
                <TableHead>Aderência</TableHead>
                <TableHead className="min-w-56">Recomendação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.requirement}</TableCell>
                  <TableCell>
                    <Badge variant={r.type === "obrigatorio" ? "default" : "secondary"}>
                      {r.type === "obrigatorio" ? "Obrigatório" : "Desejável"}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{r.priority}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.evidence || "Informação não identificada."}
                  </TableCell>
                  <TableCell>{adherenceBadge(r.adherence)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.recommendation || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
