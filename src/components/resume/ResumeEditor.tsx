import { useState } from "react";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { rewriteSnippet } from "@/lib/ai.functions";
import type { ResumeContent } from "@/lib/types";

const ACTIONS = [
  "Tornar mais objetivo",
  "Tornar mais profissional",
  "Adicionar verbo de ação",
  "Reduzir repetição",
  "Adaptar à vaga",
  "Corrigir gramática",
  "Encurtar",
  "Gerar alternativa",
  "Destacar resultado existente",
  "Simplificar linguagem",
];

interface AssistantTarget {
  text: string;
  apply: (value: string) => void;
}

export function ResumeEditor({
  content,
  onChange,
  jobTitle,
}: {
  content: ResumeContent;
  onChange: (next: ResumeContent) => void;
  jobTitle: string;
}) {
  const runRewrite = useServerFn(rewriteSnippet);
  const [target, setTarget] = useState<AssistantTarget | null>(null);
  const [action, setAction] = useState<string>(ACTIONS[0]);
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (patch: Partial<ResumeContent>) => onChange({ ...content, ...patch });

  const openAssistant = (text: string, apply: (value: string) => void, chosen: string) => {
    setTarget({ text, apply });
    setAction(chosen);
    setSuggestion("");
    void generate(text, chosen);
  };

  const generate = async (text: string, chosen: string) => {
    setLoading(true);
    try {
      const res = await runRewrite({ data: { text, action: chosen, jobTitle } });
      setSuggestion(res.suggestion);
    } catch {
      toast.error("Não foi possível gerar a sugestão agora.");
      setSuggestion("");
    } finally {
      setLoading(false);
    }
  };

  const AssistantButton = ({
    text,
    apply,
  }: {
    text: string;
    apply: (value: string) => void;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!text.trim()}>
          <Wand2 className="size-4" aria-hidden="true" />
          Assistente
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ACTIONS.map((a) => (
          <DropdownMenuItem key={a} onClick={() => openAssistant(text, apply, a)}>
            {a}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={["dados", "resumo", "exp"]}>
        <AccordionItem value="dados">
          <AccordionTrigger>Dados de contato</AccordionTrigger>
          <AccordionContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="e-name">Nome completo</Label>
              <Input
                id="e-name"
                className="mt-1"
                value={content.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="e-title">Título profissional</Label>
              <Input
                id="e-title"
                className="mt-1"
                value={content.professionalTitle}
                onChange={(e) => set({ professionalTitle: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="e-loc">Cidade e estado</Label>
              <Input
                id="e-loc"
                className="mt-1"
                value={content.location}
                onChange={(e) => set({ location: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="e-mail">E-mail</Label>
              <Input
                id="e-mail"
                className="mt-1"
                value={content.contacts.email}
                onChange={(e) => set({ contacts: { ...content.contacts, email: e.target.value } })}
              />
            </div>
            <div>
              <Label htmlFor="e-phone">Telefone</Label>
              <Input
                id="e-phone"
                className="mt-1"
                value={content.contacts.phone}
                onChange={(e) => set({ contacts: { ...content.contacts, phone: e.target.value } })}
              />
            </div>
            <div>
              <Label htmlFor="e-in">LinkedIn</Label>
              <Input
                id="e-in"
                className="mt-1"
                value={content.contacts.linkedin}
                onChange={(e) =>
                  set({ contacts: { ...content.contacts, linkedin: e.target.value } })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="e-port">Portfólio</Label>
              <Input
                id="e-port"
                className="mt-1"
                value={content.contacts.portfolio}
                onChange={(e) =>
                  set({ contacts: { ...content.contacts, portfolio: e.target.value } })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="resumo">
          <AccordionTrigger>Resumo profissional</AccordionTrigger>
          <AccordionContent>
            <div className="flex justify-end">
              <AssistantButton
                text={content.summary}
                apply={(value) => set({ summary: value })}
              />
            </div>
            <Textarea
              aria-label="Resumo profissional"
              value={content.summary}
              onChange={(e) => set({ summary: e.target.value })}
              className="min-h-32"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>Competências</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div>
              <Label htmlFor="e-core">Competências técnicas (separadas por ponto e vírgula)</Label>
              <Textarea
                id="e-core"
                className="mt-1"
                value={content.coreSkills.join("; ")}
                onChange={(e) =>
                  set({
                    coreSkills: e.target.value
                      .split(";")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="e-soft">Competências comportamentais</Label>
              <Textarea
                id="e-soft"
                className="mt-1"
                value={content.softSkills.join("; ")}
                onChange={(e) =>
                  set({
                    softSkills: e.target.value
                      .split(";")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="e-tools">Ferramentas e tecnologias</Label>
              <Textarea
                id="e-tools"
                className="mt-1"
                value={content.tools.join("; ")}
                onChange={(e) =>
                  set({
                    tools: e.target.value
                      .split(";")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="exp">
          <AccordionTrigger>Experiência profissional</AccordionTrigger>
          <AccordionContent className="space-y-5">
            {content.experiences.map((exp, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="secondary">Experiência {i + 1}</Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...content.experiences];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        set({ experiences: next });
                      }}
                    >
                      Subir
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir experiência ${i + 1}`}
                      onClick={() =>
                        set({ experiences: content.experiences.filter((_, j) => j !== i) })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    aria-label="Cargo"
                    placeholder="Cargo"
                    value={exp.role}
                    onChange={(e) => {
                      const next = [...content.experiences];
                      next[i] = { ...exp, role: e.target.value };
                      set({ experiences: next });
                    }}
                  />
                  <Input
                    aria-label="Empresa"
                    placeholder="Empresa"
                    value={exp.company}
                    onChange={(e) => {
                      const next = [...content.experiences];
                      next[i] = { ...exp, company: e.target.value };
                      set({ experiences: next });
                    }}
                  />
                  <Input
                    aria-label="Local"
                    placeholder="Local"
                    value={exp.location}
                    onChange={(e) => {
                      const next = [...content.experiences];
                      next[i] = { ...exp, location: e.target.value };
                      set({ experiences: next });
                    }}
                  />
                  <Input
                    aria-label="Período"
                    placeholder="Período"
                    value={exp.period}
                    onChange={(e) => {
                      const next = [...content.experiences];
                      next[i] = { ...exp, period: e.target.value };
                      set({ experiences: next });
                    }}
                  />
                </div>
                <Separator className="my-3" />
                <Label className="text-xs">Atividades e resultados</Label>
                {exp.bullets.map((b, j) => (
                  <div key={j} className="mt-2 flex items-start gap-2">
                    <Textarea
                      aria-label={`Item ${j + 1} da experiência ${i + 1}`}
                      value={b}
                      onChange={(e) => {
                        const next = [...content.experiences];
                        const bullets = [...exp.bullets];
                        bullets[j] = e.target.value;
                        next[i] = { ...exp, bullets };
                        set({ experiences: next });
                      }}
                      className="min-h-16"
                    />
                    <div className="flex flex-col">
                      <AssistantButton
                        text={b}
                        apply={(value) => {
                          const next = [...content.experiences];
                          const bullets = [...exp.bullets];
                          bullets[j] = value;
                          next[i] = { ...exp, bullets };
                          set({ experiences: next });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Excluir item ${j + 1}`}
                        onClick={() => {
                          const next = [...content.experiences];
                          next[i] = { ...exp, bullets: exp.bullets.filter((_, k) => k !== j) };
                          set({ experiences: next });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    const next = [...content.experiences];
                    next[i] = { ...exp, bullets: [...exp.bullets, ""] };
                    set({ experiences: next });
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Adicionar item
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                set({
                  experiences: [
                    ...content.experiences,
                    { role: "", company: "", location: "", period: "", context: "", bullets: [""] },
                  ],
                })
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              Adicionar experiência
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="edu">
          <AccordionTrigger>Formação, cursos e idiomas</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <Label>Formação acadêmica</Label>
              {content.education.map((ed, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-3">
                  <Input
                    aria-label="Curso"
                    placeholder="Curso"
                    value={ed.degree}
                    onChange={(e) => {
                      const next = [...content.education];
                      next[i] = { ...ed, degree: e.target.value };
                      set({ education: next });
                    }}
                  />
                  <Input
                    aria-label="Instituição"
                    placeholder="Instituição"
                    value={ed.institution}
                    onChange={(e) => {
                      const next = [...content.education];
                      next[i] = { ...ed, institution: e.target.value };
                      set({ education: next });
                    }}
                  />
                  <div className="flex gap-2">
                    <Input
                      aria-label="Período"
                      placeholder="Período"
                      value={ed.period}
                      onChange={(e) => {
                        const next = [...content.education];
                        next[i] = { ...ed, period: e.target.value };
                        set({ education: next });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir formação ${i + 1}`}
                      onClick={() =>
                        set({ education: content.education.filter((_, j) => j !== i) })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  set({
                    education: [
                      ...content.education,
                      { degree: "", institution: "", period: "", details: "" },
                    ],
                  })
                }
              >
                <Plus className="size-4" aria-hidden="true" />
                Adicionar formação
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Cursos e certificações</Label>
              {content.certifications.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    aria-label="Curso ou certificação"
                    value={c.name}
                    onChange={(e) => {
                      const next = [...content.certifications];
                      next[i] = { ...c, name: e.target.value };
                      set({ certifications: next });
                    }}
                  />
                  <Input
                    aria-label="Ano"
                    className="w-28"
                    value={c.year}
                    onChange={(e) => {
                      const next = [...content.certifications];
                      next[i] = { ...c, year: e.target.value };
                      set({ certifications: next });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir certificação ${i + 1}`}
                    onClick={() =>
                      set({ certifications: content.certifications.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  set({
                    certifications: [...content.certifications, { name: "", issuer: "", year: "" }],
                  })
                }
              >
                <Plus className="size-4" aria-hidden="true" />
                Adicionar certificação
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Idiomas</Label>
              {content.languages.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    aria-label="Idioma"
                    value={l.name}
                    onChange={(e) => {
                      const next = [...content.languages];
                      next[i] = { ...l, name: e.target.value };
                      set({ languages: next });
                    }}
                  />
                  <Input
                    aria-label="Nível informado"
                    value={l.level}
                    onChange={(e) => {
                      const next = [...content.languages];
                      next[i] = { ...l, level: e.target.value };
                      set({ languages: next });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir idioma ${i + 1}`}
                    onClick={() =>
                      set({ languages: content.languages.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => set({ languages: [...content.languages, { name: "", level: "" }] })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Adicionar idioma
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <Sparkles className="mr-1 inline size-4" aria-hidden="true" />
              {action}
            </DialogTitle>
            <DialogDescription>
              A sugestão preserva os fatos do texto original. Revise antes de aplicar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Texto atual</Label>
              <p className="mt-1 rounded-lg border bg-muted p-3 text-sm">{target?.text}</p>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Texto sugerido</Label>
              <p className="mt-1 rounded-lg border bg-accent p-3 text-sm">
                {loading ? "Gerando sugestão…" : suggestion || "—"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!suggestion || loading}
              onClick={() => {
                target?.apply(suggestion);
                setTarget(null);
                toast.success("Alteração aplicada.");
              }}
            >
              Aplicar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
