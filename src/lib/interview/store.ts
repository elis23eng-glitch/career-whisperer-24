import { isBrowser, newId, subscribeStorage, listAnalyses } from "@/lib/storage";
import type { InterviewSession, SavedJob, SavedResume } from "./schemas";

const JOBS_KEY = "matchcv:jobs";
const RESUMES_KEY = "matchcv:resumes";
const INTERVIEWS_KEY = "matchcv:interviews";

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeInterviewStore(listener: () => void) {
  listeners.add(listener);
  const off = subscribeStorage(listener);
  return () => {
    listeners.delete(listener);
    off();
  };
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

const now = () => new Date().toISOString();

/* ---------------------------------- Vagas --------------------------------- */

export function listJobs(): SavedJob[] {
  return read<SavedJob[]>(JOBS_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getJob(id: string) {
  return listJobs().find((j) => j.id === id);
}

export function saveJob(input: Omit<SavedJob, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const all = read<SavedJob[]>(JOBS_KEY, []);
  const idx = input.id ? all.findIndex((j) => j.id === input.id) : -1;
  const record: SavedJob =
    idx >= 0
      ? { ...all[idx]!, ...input, id: all[idx]!.id, updatedAt: now() }
      : { ...input, id: input.id ?? newId(), createdAt: now(), updatedAt: now() };
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  write(JOBS_KEY, all);
  notify();
  return record;
}

export function deleteJob(id: string) {
  write(
    JOBS_KEY,
    read<SavedJob[]>(JOBS_KEY, []).filter((j) => j.id !== id),
  );
  notify();
}

/* -------------------------------- Currículos ------------------------------ */

export function listResumes(): SavedResume[] {
  return read<SavedResume[]>(RESUMES_KEY, []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getResume(id: string) {
  return listResumes().find((r) => r.id === id);
}

export function getPrimaryResume(): SavedResume | undefined {
  const all = listResumes();
  return all.find((r) => r.isPrimary) ?? all[0];
}

export function saveResume(
  input: Omit<SavedResume, "id" | "createdAt" | "updatedAt"> & { id?: string },
) {
  const all = read<SavedResume[]>(RESUMES_KEY, []);
  const idx = input.id ? all.findIndex((r) => r.id === input.id) : -1;
  const record: SavedResume =
    idx >= 0
      ? { ...all[idx]!, ...input, id: all[idx]!.id, updatedAt: now() }
      : { ...input, id: input.id ?? newId(), createdAt: now(), updatedAt: now() };
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  if (record.isPrimary) {
    all.forEach((r) => {
      if (r.id !== record.id) r.isPrimary = false;
    });
  }
  write(RESUMES_KEY, all);
  notify();
  return record;
}

export function setPrimaryResume(id: string) {
  const all = read<SavedResume[]>(RESUMES_KEY, []);
  all.forEach((r) => (r.isPrimary = r.id === id));
  write(RESUMES_KEY, all);
  notify();
}

export function deleteResume(id: string) {
  write(
    RESUMES_KEY,
    read<SavedResume[]>(RESUMES_KEY, []).filter((r) => r.id !== id),
  );
  notify();
}

/* ------------------------------- Entrevistas ------------------------------ */

export function listInterviews(): InterviewSession[] {
  return read<InterviewSession[]>(INTERVIEWS_KEY, []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getInterview(id: string) {
  return listInterviews().find((i) => i.id === id);
}

export function saveInterview(session: InterviewSession) {
  const all = read<InterviewSession[]>(INTERVIEWS_KEY, []);
  const idx = all.findIndex((i) => i.id === session.id);
  const record = { ...session, updatedAt: now() };
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  write(INTERVIEWS_KEY, all);
  notify();
  return record;
}

export function deleteInterview(id: string) {
  write(
    INTERVIEWS_KEY,
    read<InterviewSession[]>(INTERVIEWS_KEY, []).filter((i) => i.id !== id),
  );
  notify();
}

export function averageOf(session: InterviewSession) {
  const scores = session.turns
    .map((t) => t.evaluation?.overall)
    .filter((n): n is number => typeof n === "number");
  if (!scores.length) return undefined;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/* --------------- Importação a partir das análises já existentes ------------ */

/** Cria vagas/currículos salvos a partir das análises antigas, sem duplicar. */
export function syncFromAnalyses() {
  if (!isBrowser()) return;
  const analyses = listAnalyses();
  if (!analyses.length) return;

  const jobs = read<SavedJob[]>(JOBS_KEY, []);
  const resumes = read<SavedResume[]>(RESUMES_KEY, []);
  let changed = false;

  for (const a of analyses) {
    if (!jobs.some((j) => j.analysisId === a.id)) {
      jobs.push({
        id: newId(),
        createdAt: a.createdAt,
        updatedAt: a.createdAt,
        title: a.job.jobTitle || "Vaga sem título",
        company: a.job.company ?? "",
        location: a.job.location ?? "",
        workModel: a.job.workModel ?? "nao_identificado",
        seniority: a.job.seniority ?? "",
        description: a.job.rawDescription ?? "",
        analysisId: a.id,
      });
      changed = true;
    }
    if (!resumes.some((r) => r.analysisId === a.id)) {
      resumes.push({
        id: newId(),
        createdAt: a.createdAt,
        updatedAt: a.createdAt,
        name: a.resume.content.fullName || a.resume.sourceFileName || "Meu currículo",
        rawText: a.resume.rawText ?? "",
        fileName: a.resume.sourceFileName ?? "",
        isPrimary: false,
        analysisId: a.id,
      });
      changed = true;
    }
  }

  if (changed) {
    if (!resumes.some((r) => r.isPrimary) && resumes[0]) resumes[0].isPrimary = true;
    write(JOBS_KEY, jobs);
    write(RESUMES_KEY, resumes);
    notify();
  }
}
