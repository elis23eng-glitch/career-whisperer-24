/**
 * Reconhecimento de voz do navegador (Web Speech API).
 * O áudio é usado somente para gerar a transcrição — nada é gravado nem enviado
 * para os nossos servidores.
 */

export type SpeechLang = "pt-BR" | "en-US";

export type MicPermission = "desconhecida" | "permitida" | "negada" | "indisponivel";

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
    | (new () => RecognitionLike)
    | undefined;
  return ctor ?? null;
}

export function isRecognitionSupported() {
  return getRecognitionCtor() !== null;
}

export function isMicrophoneApiAvailable() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** Pede permissão só quando o usuário pedir. Encerra a captura logo em seguida. */
export async function requestMicPermission(): Promise<MicPermission> {
  if (!isMicrophoneApiAvailable()) return "indisponivel";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "permitida";
  } catch (error) {
    const name = (error as { name?: string })?.name ?? "";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "indisponivel";
    return "negada";
  }
}

export interface RecognitionHandlers {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string, permission: MicPermission) => void;
  onEnd?: () => void;
  onSilence?: () => void;
}

const NO_SPEECH_MS = 12000;

export class VoiceRecognizer {
  private recognition: RecognitionLike | null = null;
  private manualStop = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: RecognitionHandlers = {};
  private lang: SpeechLang = "pt-BR";
  running = false;

  start(lang: SpeechLang, handlers: RecognitionHandlers) {
    if (this.running) return; // impede duas gravações simultâneas
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      handlers.onError?.(
        "O recurso de voz não está disponível neste navegador. Você pode continuar a entrevista digitando suas respostas.",
        "indisponivel",
      );
      return;
    }
    this.handlers = handlers;
    this.lang = lang;
    this.manualStop = false;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.running = true;
      this.armSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      this.armSilenceTimer();
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          if (text.trim()) this.handlers.onFinal?.(text.trim());
        } else {
          interim += text;
        }
      }
      if (interim.trim()) this.handlers.onInterim?.(interim.trim());
    };

    recognition.onerror = (event: any) => {
      const code = String(event?.error ?? "");
      if (code === "no-speech") {
        this.handlers.onSilence?.();
        return;
      }
      if (code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        this.handlers.onError?.(
          "O microfone não está autorizado. Libere o acesso nas permissões do navegador ou responda digitando.",
          "negada",
        );
        return;
      }
      if (code === "audio-capture") {
        this.handlers.onError?.(
          "Não encontramos um microfone disponível. Você pode responder digitando.",
          "indisponivel",
        );
        return;
      }
      if (code === "network") {
        this.handlers.onError?.(
          "A conexão falhou durante a transcrição. O texto já reconhecido foi mantido — tente continuar a gravação.",
          "permitida",
        );
        return;
      }
      this.handlers.onError?.("Não foi possível ouvir sua resposta agora. Tente novamente.", "permitida");
    };

    recognition.onend = () => {
      this.clearSilenceTimer();
      // Alguns navegadores encerram sozinhos; se não foi o usuário, retomamos.
      if (!this.manualStop && this.running) {
        try {
          recognition.start();
          return;
        } catch {
          /* segue para encerrar */
        }
      }
      this.running = false;
      this.recognition = null;
      this.handlers.onEnd?.();
    };

    this.recognition = recognition;
    try {
      recognition.start();
      this.running = true;
    } catch {
      this.running = false;
      handlers.onError?.("Não foi possível iniciar a gravação. Tente novamente.", "permitida");
    }
  }

  private armSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.handlers.onSilence?.();
    }, NO_SPEECH_MS);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
  }

  stop() {
    this.manualStop = true;
    this.clearSilenceTimer();
    const recognition = this.recognition;
    this.running = false;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      /* ignore */
    }
  }

  /** Encerra imediatamente (saída da página, troca de pergunta). */
  dispose() {
    this.manualStop = true;
    this.clearSilenceTimer();
    const recognition = this.recognition;
    this.recognition = null;
    this.running = false;
    if (!recognition) return;
    try {
      recognition.abort();
    } catch {
      /* ignore */
    }
  }

  get language() {
    return this.lang;
  }
}
