import { Conversation, type Mode } from '@elevenlabs/client';
import { hasWakeWord } from './wake';

/**
 * Escucha en segundo plano con la Web Speech API del navegador y, al oír
 * "Jarvis", abre una conversación de voz con el agente de ElevenLabs. Cuando la
 * conversación termina vuelve a quedar esperando la palabra clave.
 *
 * Las dos cosas usan el micrófono, así que nunca corren a la vez: el
 * reconocedor se corta antes de conectar y se reanuda al colgar.
 */

export type JarvisState =
  | { kind: 'off' }
  | { kind: 'waiting' }
  | { kind: 'connecting' }
  | { kind: 'talking'; mode: Mode }
  | { kind: 'error'; message: string };

// lib.dom de TypeScript no trae SpeechRecognition; alcanza con lo que usamos.
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Session = Awaited<ReturnType<typeof Conversation.startSession>>;

export class Jarvis {
  private recognition: Recognition | null = null;
  private session: Session | null = null;
  private state: JarvisState = { kind: 'off' };
  private wakeLock: { release(): Promise<void> } | null = null;

  constructor(
    private readonly agentId: string,
    private readonly onState: (s: JarvisState) => void,
    private readonly lang = 'es-AR',
  ) {}

  /** Tiene que llamarse desde un click: el navegador exige un gesto para el micrófono y el audio. */
  async enable() {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      this.set({ kind: 'error', message: 'Este navegador no soporta reconocimiento de voz. Usá Chrome o Edge.' });
      return;
    }
    try {
      // Pide permiso una sola vez; después lo reusan el reconocedor y ElevenLabs.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      this.set({ kind: 'error', message: 'Sin permiso para el micrófono.' });
      return;
    }

    this.recognition?.abort();
    const rec = new Ctor();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (hasWakeWord(e.results[i][0].transcript)) {
          void this.wake();
          return;
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.set({ kind: 'error', message: 'El navegador bloqueó el reconocimiento de voz.' });
      }
      // 'no-speech', 'network', 'aborted': onend se encarga de reanudar.
    };
    // Chrome corta el reconocimiento continuo cada tanto; lo reanudamos mientras esperamos.
    rec.onend = () => {
      if (this.state.kind === 'waiting') setTimeout(() => this.listen(), 250);
    };
    this.recognition = rec;

    void this.keepScreenOn();
    this.set({ kind: 'waiting' });
    this.listen();
  }

  /** Arranca la conversación sin decir la palabra clave. */
  async wake() {
    if (this.state.kind !== 'waiting') return;
    this.set({ kind: 'connecting' });
    this.recognition?.abort();
    chime();

    try {
      this.session = await Conversation.startSession({
        agentId: this.agentId,
        connectionType: 'webrtc',
        onModeChange: ({ mode }) => this.set({ kind: 'talking', mode }),
        onConnect: () => this.set({ kind: 'talking', mode: 'listening' }),
        onDisconnect: () => this.backToWaiting(),
        onError: (message) => console.error('[jarvis]', message),
      });
    } catch (err) {
      this.session = null;
      this.set({ kind: 'error', message: `No se pudo conectar con el asistente: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  async hangUp() {
    await this.session?.endSession();
  }

  async disable() {
    this.set({ kind: 'off' });
    this.recognition?.abort();
    this.recognition = null;
    await this.session?.endSession();
    this.session = null;
    await this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
  }

  private backToWaiting() {
    this.session = null;
    if (this.state.kind === 'off' || this.state.kind === 'error') return;
    this.set({ kind: 'waiting' });
    this.listen();
  }

  private listen() {
    try {
      this.recognition?.start();
    } catch {
      // start() tira si ya estaba corriendo; no pasa nada.
    }
  }

  /** En el celular la pantalla apagada corta el micrófono, así que la mantenemos prendida. */
  private async keepScreenOn() {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    try {
      this.wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      this.wakeLock = null;
    }
  }

  private set(s: JarvisState) {
    this.state = s;
    this.onState(s);
  }
}

/** Dos tonos cortos para confirmar que escuchó "Jarvis". */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
    setTimeout(() => void ctx.close(), 500);
  } catch {
    // Sin audio no hay tono; la conversación sigue igual.
  }
}
