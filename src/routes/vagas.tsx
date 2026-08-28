import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Briefcase, MessageSquare, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteJob,
  listJobs,
  saveJob,
  subscribeInterviewStore,
  syncFromAnalyses,
} from "@/lib/interview/store";
import type { SavedJob } from "@/lib/interview/schemas";

export const Route = createFileRoute("/vagas")({
  head: () => ({
    meta: [
      { title: "Minhas vagas | MatchCV Recruiter" },
      {
        name: "description",
        content:
          "Cadastre as vagas que você quer conquistar e use cada uma para analisar seu currículo ou treinar uma entrevista simulada.",
      },
      { property: "og:title", content: "Minhas vagas | MatchCV Recruiter" },
      {
        property: "og:description",
        content: "Salve vagas, analise a compatibilidade e treine entrevistas com o agente de IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JobsPage,
});

const WORK_MODELS = [
  { value: "nao_identificado", label: "Não informado" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
  { value: "remoto", label: "Remoto" },
];

const emptyForm = {
  title: "",
  company: "",
  location: "",
  workModel: "nao_identificado",
  seniority: "",
  description: "",
};

function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [removing, setRemoving] = useState<SavedJob | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    syncFromAnalyses();
    const refresh = () => setJobs(listJobs());
    refresh();
    setReady(true);
    return subscribeInterviewStore(refresh);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 2) {
      toast.error("Informe o nome da vaga.");
      return;
    }
    if (form.description.trim().length < 30) {
      toast.error("Cole a descrição da vaga com pelo menos 30 caracteres.");
      return;
    }
    saveJob({ ...form, id: editingId });
    toast.success(editingId ? "Vaga atualizada." : "Vaga salva neste dispositivo.");
    setForm(emptyForm);
    setEditingId(undefined);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minhas vagas</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Guarde aqui as vagas que você quer conquistar. Depois é só escolher uma para analisar seu
          currículo ou treinar uma entrevista. Tudo fica salvo apenas neste aparelho.
        </p>
      </header>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-xl">
            {editingId ? "Editar vaga" : "Cadastrar nova vaga"}
          </CardTitle>
          <CardDescription>
            Preencha os campos abaixo. Quanto mais completa a descrição, melhores serão a análise e
            as perguntas da entrevista.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="job-title">Nome da vaga</Label>
                <Input
                  id="job-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Analista de Suporte Pleno"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-company">Empresa</Label>
                <Input
                  id="job-company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Ex.: Empresa XYZ"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-location">Localização</Label>
                <Input
                  id="job-location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ex.: São Paulo - SP"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-model">Modalidade</Label>
                <Select
                  value={form.workModel}
                  onValueChange={(value) => setForm({ ...form, workModel: value })}
                >
                  <SelectTrigger id="job-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="job-seniority">Nível / senioridade</Label>
                <Input
                  id="job-seniority"
                  value={form.seniority}
                  onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                  placeholder="Ex.: Júnior, Pleno, Sênior"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="job-description">Descrição completa da vaga</Label>
              <Textarea
                id="job-description"
                rows={9}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Cole aqui o texto completo do anúncio: atividades, requisitos e diferenciais."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg">
                <Plus className="size-4" aria-hidden="true" />
                {editingId ? "Salvar alterações" : "Salvar vaga"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    setForm(emptyForm);
                    setEditingId(undefined);
                  }}
                >
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-10 mb-4 text-xl font-semibold">Vagas salvas ({jobs.length})</h2>

      {!ready ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Você ainda não salvou nenhuma vaga. Cadastre a primeira no formulário acima.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription>
                      {[job.company, job.location, job.seniority].filter(Boolean).join(" • ") ||
                        "Sem detalhes adicionais"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {WORK_MODELS.find((m) => m.value === job.workModel)?.label ?? "Não informado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      router.navigate({ to: "/entrevista/nova", search: { vaga: job.id } })
                    }
                  >
                    <MessageSquare className="size-4" aria-hidden="true" />
                    Treinar entrevista
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/analise">
                      <Briefcase className="size-4" aria-hidden="true" />
                      Analisar compatibilidade
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingId(job.id);
                      setForm({
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        workModel: job.workModel,
                        seniority: job.seniority,
                        description: job.description,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setRemoving(job)}
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
            <AlertDialogTitle>Excluir esta vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              A vaga “{removing?.title}” será removida deste aparelho. As entrevistas já feitas com
              ela continuam salvas. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) deleteJob(removing.id);
                setRemoving(null);
                toast.success("Vaga excluída.");
              }}
            >
              Excluir vaga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
