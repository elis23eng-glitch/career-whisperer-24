import { useState } from "react";
import { Check, HelpCircle, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { confirmedExperienceSchema, type ConfirmedExperience, type MatchResult } from "@/lib/types";

export function KeywordsTab({
  match,
  confirmed,
  onConfirm,
}: {
  match: MatchResult;
  confirmed: ConfirmedExperience[];
  onConfirm: (item: ConfirmedExperience) => void;
}) {
  const [term, setTerm] = useState<string | null>(null);
  const [form, setForm] = useState<ConfirmedExperience>({
    term: "",
    context: "",
    companyOrProject: "",
    activity: "",
    result: "",
    period: "",
    tool: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, "nao_tenho" | "duvida">>({});

  const strong = match.keywordsFound.filter((k) => k.strength === "forte");
  const weak = match.keywordsFound.filter((k) => k.strength === "fraca");

  const openDialog = (value: string) => {
    setTerm(value);
    setErrors([]);
    setForm({
      term: value,
      context: "",
      companyOrProject: "",
      activity: "",
      result: "",
      period: "",
      tool: "",
    });
  };

  const submit = () => {
    const parsed = confirmedExperienceSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    onConfirm(parsed.data as ConfirmedExperience);
    setTerm(null);
    toast.success("Experiência confirmada", {
      description: "Ela poderá ser usada ao gerar o currículo direcionado.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buscar palavra-chave</CardTitle>
          <CardDescription>Procure entre os termos identificados na vaga.</CardDescription>
        </CardHeader>
        <CardContent>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Digite para buscar um termo…" />
            <CommandList>
              <CommandEmpty>Nenhum termo encontrado.</CommandEmpty>
              {[...match.keywordsFound.map((k) => k.term), ...match.keywordsMissing.map((k) => k.term)].map(
                (t) => (
                  <CommandItem key={t} value={t}>
                    {t}
                  </CommandItem>
                ),
              )}
            </CommandList>
          </Command>
        </CardContent>
      </Card>

      <section>
        <h3 className="text-lg font-semibold">Encontradas no currículo</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {strong.length ? (
            strong.map((k) => (
              <Badge key={k.term} className="bg-success text-success-foreground">
                {k.term}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum termo encontrado com força.</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Presentes com pouca força</h3>
        <p className="text-sm text-muted-foreground">
          Termos relacionados que podem ser descritos de maneira mais objetiva.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {weak.length ? (
            weak.map((k) => (
              <Badge key={k.term} className="bg-highlight text-highlight-foreground">
                {k.term}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum termo nesta situação.</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Ausentes</h3>
        <p className="text-sm text-muted-foreground">
          Termos da vaga sem evidência no currículo. Só incluiremos algo depois da sua confirmação.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {match.keywordsMissing.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum termo ausente identificado.</p>
          ) : null}
          {match.keywordsMissing.map((k) => {
            const isConfirmed = confirmed.some((c) => c.term === k.term);
            const note = notes[k.term];
            return (
              <Card key={k.term}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{k.term}</span>
                    <Badge variant="outline" className="capitalize">
                      {k.importance}
                    </Badge>
                  </div>
                  {k.why ? <p className="text-sm text-muted-foreground">{k.why}</p> : null}
                  {isConfirmed ? (
                    <Badge className="bg-success text-success-foreground">
                      Conteúdo confirmado pelo usuário
                    </Badge>
                  ) : note ? (
                    <Badge variant="secondary">
                      {note === "nao_tenho" ? "Marcado como não possuo" : "Marcado como incerto"}
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openDialog(k.term)}>
                        <Check className="size-4" aria-hidden="true" />
                        Tenho essa experiência
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNotes((n) => ({ ...n, [k.term]: "nao_tenho" }))}
                      >
                        <X className="size-4" aria-hidden="true" />
                        Não tenho
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNotes((n) => ({ ...n, [k.term]: "duvida" }))}
                      >
                        <HelpCircle className="size-4" aria-hidden="true" />
                        Não tenho certeza
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Dialog open={!!term} onOpenChange={(open) => !open && setTerm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar experiência com “{term}”</DialogTitle>
            <DialogDescription>
              Descreva o que você realmente fez. Nada será incluído no currículo sem esta
              confirmação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="c-context">Contexto</Label>
              <Textarea
                id="c-context"
                className="mt-1"
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-company">Empresa ou projeto</Label>
                <Input
                  id="c-company"
                  className="mt-1"
                  value={form.companyOrProject}
                  onChange={(e) => setForm({ ...form, companyOrProject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="c-period">Período</Label>
                <Input
                  id="c-period"
                  className="mt-1"
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="c-activity">Atividade realizada</Label>
              <Textarea
                id="c-activity"
                className="mt-1"
                value={form.activity}
                onChange={(e) => setForm({ ...form, activity: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-result">Resultado</Label>
                <Input
                  id="c-result"
                  className="mt-1"
                  value={form.result}
                  onChange={(e) => setForm({ ...form, result: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="c-tool">Ferramenta utilizada</Label>
                <Input
                  id="c-tool"
                  className="mt-1"
                  value={form.tool}
                  onChange={(e) => setForm({ ...form, tool: e.target.value })}
                />
              </div>
            </div>
            {errors.length ? (
              <ul className="rounded-lg border border-destructive p-3 text-sm text-destructive">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerm(null)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Confirmar experiência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
