import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { extractTextFromFile, validateFile } from "@/lib/extract";
import {
  deleteResume,
  listResumes,
  saveResume,
  setPrimaryResume,
  subscribeInterviewStore,
  syncFromAnalyses,
} from "@/lib/interview/store";
import type { SavedResume } from "@/lib/interview/schemas";

export const Route = createFileRoute("/meu-curriculo")({
  head: () => ({
    meta: [
      { title: "Meu currículo | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Importe seu currículo em PDF ou DOCX, cole o texto, edite o conteúdo e salve diferentes versões para usar nas análises e entrevistas.",
      },
      { property: "og:title", content: "Meu currículo | MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Importe, edite e escolha o currículo principal usado pela IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyResumePage,
});

function MyResumePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [extracting, setExtracting] = useState(false);
  const [removing, setRemoving] = useState<SavedResume | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    syncFromAnalyses();
    const refresh = () => setResumes(listResumes());
    refresh();
    setReady(true);
    return subscribeInterviewStore(refresh);
  }, []);

  const handleFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setExtracting(true);
    try {
      const extracted = await extractTextFromFile(file);
      if (extracted.trim().length < 50) {
        toast.error("Não conseguimos ler o texto deste arquivo. Cole o conteúdo manualmente.");
        return;
      }
      setText(extracted);
      setFileName(file.name);
      if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
      toast.success("Currículo lido com sucesso. Confira o texto abaixo.");
    } catch {
      toast.error("Não foi possível ler o arquivo. Tente novamente ou cole o texto.");
    } finally {
      setExtracting(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (text.trim().length < 50) {
      toast.error("O currículo precisa ter pelo menos 50 caracteres.");
      return;
    }
    saveResume({
      id: editingId,
      name: name.trim() || "Meu currículo",
      rawText: text.trim(),
      fileName,
      isPrimary: resumes.length === 0,
    });
    toast.success(editingId ? "Versão atualizada." : "Currículo salvo neste aparelho.");
    setEditingId(undefined);
    setName("");
    setText("");
    setFileName("");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Meu currículo</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Importe um arquivo PDF ou DOCX, ou cole o texto do seu currículo. Você pode salvar
          diferentes versões e escolher qual será a principal.
        </p>
      </header>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-xl">
            {editingId ? "Editar versão do currículo" : "Adicionar currículo"}
          </CardTitle>
          <CardDescription>
            Seus dados ficam somente neste aparelho e são usados apenas para a análise e a
            entrevista.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="resume-name">Nome desta versão</Label>
              <Input
                id="resume-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Currículo para área administrativa"
              />
            </div>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
              >
                {extracting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                {extracting ? "Lendo arquivo…" : "Importar PDF, DOCX ou TXT"}
              </Button>
              {fileName ? (
                <p className="mt-2 text-sm text-muted-foreground">Arquivo lido: {fileName}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="resume-text">Conteúdo do currículo</Label>
              <Textarea
                id="resume-text"
                rows={14}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cole aqui o texto do seu currículo ou revise o conteúdo importado."
              />
              <p className="text-sm text-muted-foreground">
                {text.trim().length} caracteres. Revise antes de salvar: você pode corrigir o que a
                leitura automática não entendeu.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg">
                {editingId ? "Salvar alterações" : "Salvar currículo"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    setEditingId(undefined);
                    setName("");
                    setText("");
                    setFileName("");
                  }}
                >
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-10 mb-4 text-xl font-semibold">Versões salvas ({resumes.length})</h2>

      {!ready ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : resumes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum currículo salvo ainda. Importe ou cole o seu no formulário acima.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{resume.name}</CardTitle>
                    <CardDescription>
                      Salvo em {new Date(resume.createdAt).toLocaleDateString("pt-BR")}
                      {resume.fileName ? ` • ${resume.fileName}` : ""}
                    </CardDescription>
                  </div>
                  {resume.isPrimary ? (
                    <Badge>
                      <Star className="size-3" aria-hidden="true" />
                      Currículo principal
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
                  {resume.rawText}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!resume.isPrimary ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPrimaryResume(resume.id);
                        toast.success("Este passou a ser o currículo principal.");
                      }}
                    >
                      <Star className="size-4" aria-hidden="true" />
                      Usar como principal
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingId(resume.id);
                      setName(resume.name);
                      setText(resume.rawText);
                      setFileName(resume.fileName);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setRemoving(resume)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta versão do currículo?</AlertDialogTitle>
            <AlertDialogDescription>
              A versão “{removing?.name}” será apagada deste aparelho e não poderá ser recuperada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) deleteResume(removing.id);
                setRemoving(null);
                toast.success("Currículo excluído.");
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
