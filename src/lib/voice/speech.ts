/**
 * Leitura das perguntas em voz alta usando a síntese de voz do próprio navegador.
 * Nenhum áudio é gravado ou enviado para servidores.
 */

export type SpeechLang = "pt-BR" | "en-US";

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

function pickVoice(lang: SpeechLang): SpeechSynthesisVoice | undefined {
  if (!isSpeechSynthesisSupported()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.filter((v) => v.lang?.replace("_", "-").toLowerCase() === lang.toLowerCase());
  const prefix = lang.split("-")[0]!.toLowerCase();
  const loose = voices.filter((v) => v.lang?.toLowerCase().startsWith(prefix));
  const pool = exact.length ? exact : loose;
  // Vozes locais costumam ser mais naturais e não dependem de conexão.
  return pool.find((v) => v.localService) ?? pool[0];
}

export function warmUpVoices() {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.getVoices();
  } catch {
    /* ignore */
  }
}

export interface SpeakOptions {
  lang?: SpeechLang;
  volume?: number;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

/** Fala um texto. Sempre interrompe uma fala anterior para não sobrepor áudios. */
export function speak(text: string, options: SpeakOptions = {}) {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    options.onEnd?.();
    return;
  }
  const { lang = "pt-BR", volume = 1, rate = 0.98 } = options;
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate; // ritmo moderado, sem pressa
  utterance.pitch = 1;
  utterance.volume = Math.min(1, Math.max(0, volume));
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => {
    currentUtterance = null;
    options.onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    options.onError?.("Não foi possível reproduzir o áudio agora.");
    options.onEnd?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  currentUtterance = null;
}

export function isSpeaking() {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
}

export function hasPendingSpeech() {
  return currentUtterance !== null;
}
