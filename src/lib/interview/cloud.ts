import { supabase } from "@/integrations/supabase/client";
import type { InterviewSession, InterviewTurn, SavedJob, SavedResume } from "./schemas";
import { interviewConfigSchema } from "./schemas";

/** Conversores entre os registros locais e as tabelas do banco. */

const iso = (v: string | null | undefined) => v ?? new Date().toISOString();

export function jobFromRow(row: Record<string, unknown>): SavedJob {
  return {
    id: String(row['id']),
    createdAt: iso(row['created_at'] as string),
    updatedAt: iso(row['updated_at'] as string),
    title: (row['title'] as string) ?? "",
    company: (row['company'] as string) ?? "",
    location: (row['location'] as string) ?? "",
    workModel: (row['work_model'] as string) ?? "nao_identificado",
    seniority: (row['seniority'] as string) ?? "",
    description: (row['description'] as string) ?? "",
    ...(row['analysis_id'] ? { analysisId: row['analysis_id'] as string } : {}),
  };
}

export function resumeFromRow(row: Record<string, unknown>): SavedResume {
  return {
    id: String(row['id']),
    createdAt: iso(row['created_at'] as string),
    updatedAt: iso(row['updated_at'] as string),
    name: (row['name'] as string) ?? "",
    rawText: (row['raw_text'] as string) ?? "",
    fileName: (row['file_name'] as string) ?? "",
    isPrimary: Boolean(row['is_primary']),
    ...(row['analysis_id'] ? { analysisId: row['analysis_id'] as string } : {}),
  };
}

export function interviewFromRows(
  row: Record<string, unknown>,
  turnRows: Record<string, unknown>[],
): InterviewSession {
  const turns: InterviewTurn[] = turnRows
    .sort((a, b) => Number(a['turn_index']) - Number(b['turn_index']))
    .map((t) => ({
      index: Number(t['turn_index']),
      question: t['question'] as InterviewTurn["question"],
      answer: (t['answer'] as string) ?? "",
      attempts: Number(t['attempts'] ?? 0),
      ...(t['answered_at'] ? { answeredAt: t['answered_at'] as string } : {}),
      ...(t['evaluation'] ? { evaluation: t['evaluation'] as InterviewTurn["evaluation"] } : {}),
      ...(t['source'] ? { source: t['source'] as "voz" | "texto" } : {}),
      ...(t['language'] ? { language: t['language'] as InterviewTurn["language"] } : {}),
      ...(t['duration_sec'] != null ? { durationSec: Number(t['duration_sec']) } : {}),
      ...(t['repeats'] != null ? { repeats: Number(t['repeats']) } : {}),
    }));

  return {
    id: String(row['id']),
    createdAt: iso(row['created_at'] as string),
    updatedAt: iso(row['updated_at'] as string),
    jobId: (row['job_id'] as string) ?? "",
    resumeId: (row['resume_id'] as string) ?? "",
    jobTitle: (row['job_title'] as string) ?? "",
    company: (row['company'] as string) ?? "",
    config: interviewConfigSchema.parse(row['config'] ?? {}),
    intro: (row['intro'] as string) ?? "",
    turns,
    status: ((row['status'] as string) ?? "em_andamento") as InterviewSession["status"],
    ...(row['report'] ? { report: row['report'] as InterviewSession["report"] } : {}),
    ...(row['average_score'] != null ? { averageScore: Number(row['average_score']) } : {}),
  };
}

/* --------------------------------- Leitura -------------------------------- */

export async function fetchAllFromCloud() {
  const [jobs, resumes, interviews, turns] = await Promise.all([
    supabase.from("jobs").select("*"),
    supabase.from("resumes").select("*"),
    supabase.from("interviews").select("*"),
    supabase.from("interview_turns").select("*"),
  ]);

  const turnsByInterview = new Map<string, Record<string, unknown>[]>();
  for (const t of (turns.data ?? []) as Record<string, unknown>[]) {
    const key = String(t['interview_id']);
    const list = turnsByInterview.get(key) ?? [];
    list.push(t);
    turnsByInterview.set(key, list);
  }

  return {
    jobs: ((jobs.data ?? []) as Record<string, unknown>[]).map(jobFromRow),
    resumes: ((resumes.data ?? []) as Record<string, unknown>[]).map(resumeFromRow),
    interviews: ((interviews.data ?? []) as Record<string, unknown>[]).map((r) =>
      interviewFromRows(r, turnsByInterview.get(String(r['id'])) ?? []),
    ),
  };
}

/* --------------------------------- Escrita -------------------------------- */

export async function pushJob(job: SavedJob, userId: string) {
  await supabase.from("jobs").upsert({
    id: job.id,
    user_id: userId,
    title: job.title,
    company: job.company,
    location: job.location,
    work_model: job.workModel,
    seniority: job.seniority,
    description: job.description,
    analysis_id: job.analysisId ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  });
}

export async function pushResume(resume: SavedResume, userId: string) {
  await supabase.from("resumes").upsert({
    id: resume.id,
    user_id: userId,
    name: resume.name,
    raw_text: resume.rawText,
    file_name: resume.fileName,
    is_primary: resume.isPrimary,
    analysis_id: resume.analysisId ?? null,
    created_at: resume.createdAt,
    updated_at: resume.updatedAt,
  });
}

export async function pushInterview(session: InterviewSession, userId: string) {
  const { error } = await supabase.from("interviews").upsert({
    id: session.id,
    user_id: userId,
    job_id: session.jobId,
    resume_id: session.resumeId,
    job_title: session.jobTitle,
    company: session.company,
    config: session.config,
    intro: session.intro,
    status: session.status,
    average_score: session.averageScore ?? null,
    report: session.report ?? null,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  });
  if (error) throw error;

  if (!session.turns.length) return;
  await supabase.from("interview_turns").upsert(
    session.turns.map((t) => ({
      interview_id: session.id,
      user_id: userId,
      turn_index: t.index,
      question: t.question,
      answer: t.answer,
      answered_at: t.answeredAt ?? null,
      evaluation: t.evaluation ?? null,
      attempts: t.attempts ?? 0,
      source: t.source ?? null,
      language: t.language ?? null,
      duration_sec: t.durationSec ?? null,
      repeats: t.repeats ?? null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "interview_id,turn_index" },
  );
}

export async function removeRow(table: "jobs" | "resumes" | "interviews", id: string) {
  await supabase.from(table).delete().eq("id", id);
}

export async function clearPrimaryResumes(userId: string, keepId: string) {
  await supabase.from("resumes").update({ is_primary: false }).eq("user_id", userId).neq("id", keepId);
}
