import type { AnalysisRecord } from "./types";

const SESSION_KEY = "matchcv:sessionId";
const ANALYSES_KEY = "matchcv:analyses";
const DRAFT_KEY = "matchcv:draft";
const THEME_KEY = "matchcv:theme";

export function isBrowser() {
  return typeof window !== "undefined";
}

export function getSessionId(): string {
  if (!isBrowser()) return "server";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function newId() {
  return isBrowser() ? crypto.randomUUID() : Math.random().toString(36).slice(2);
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

export function listAnalyses(): AnalysisRecord[] {
  return read<AnalysisRecord[]>(ANALYSES_KEY, []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getAnalysis(id: string): AnalysisRecord | undefined {
  return listAnalyses().find((a) => a.id === id);
}

export function saveAnalysis(record: AnalysisRecord) {
  const all = read<AnalysisRecord[]>(ANALYSES_KEY, []);
  const idx = all.findIndex((a) => a.id === record.id);
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  write(ANALYSES_KEY, all);
  notify();
}

export function deleteAnalysis(id: string) {
  write(
    ANALYSES_KEY,
    read<AnalysisRecord[]>(ANALYSES_KEY, []).filter((a) => a.id !== id),
  );
  notify();
}

export interface DraftState {
  step: number;
  jobText: string;
  jobUrl: string;
  jobFields: {
    jobTitle: string;
    company: string;
    location: string;
    workModel: string;
    seniority: string;
    area: string;
    language: string;
  };
  resumeText: string;
  resumeFileName: string;
  consent: boolean;
}

export const emptyDraft: DraftState = {
  step: 0,
  jobText: "",
  jobUrl: "",
  jobFields: {
    jobTitle: "",
    company: "",
    location: "",
    workModel: "nao_identificado",
    seniority: "",
    area: "",
    language: "pt-BR",
  },
  resumeText: "",
  resumeFileName: "",
  consent: false,
};

export function loadDraft(): DraftState {
  return { ...emptyDraft, ...read<Partial<DraftState>>(DRAFT_KEY, {}) };
}

export function saveDraft(draft: DraftState) {
  write(DRAFT_KEY, draft);
}

export function clearDraft() {
  if (isBrowser()) localStorage.removeItem(DRAFT_KEY);
}

export function getTheme(): "light" | "dark" {
  if (!isBrowser()) return "light";
  return (localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light";
}

export function setTheme(theme: "light" | "dark") {
  if (!isBrowser()) return;
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function wipeAllData() {
  if (!isBrowser()) return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith("matchcv:"))
    .forEach((k) => localStorage.removeItem(k));
  sessionStorage.clear();
  notify();
}

/* Simple pub/sub so lists refresh after writes */
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeStorage(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sanitizeFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "MatchCV"
  );
}
