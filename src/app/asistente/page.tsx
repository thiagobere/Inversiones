'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui';
import { Jarvis, type JarvisState } from '@/lib/jarvis/assistant';

const AGENT_ID = 'agent_9901m40zk8avfdfbaj1h5xehnta2';

const STATUS: Record<JarvisState['kind'], string> = {
  off: 'Apagado',
  waiting: 'Esperando "Jarvis"…',
  connecting: 'Conectando…',
  talking: 'En conversación',
  error: 'Error',
};

export default function AsistentePage() {
  const jarvis = useRef<Jarvis | null>(null);
  const [state, setState] = useState<JarvisState>({ kind: 'off' });

  useEffect(() => {
    const j = new Jarvis(AGENT_ID, setState);
    jarvis.current = j;
    return () => void j.disable();
  }, []);

  const active = state.kind !== 'off' && state.kind !== 'error';
  const detail =
    state.kind === 'talking' ? (state.mode === 'speaking' ? 'Jarvis está hablando' : 'Te escucho') :
    state.kind === 'error' ? state.message : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="serif text-3xl tracking-tight">Asistente</h1>
        <p className="mt-1.5 text-sm text-text-dim">
          Activalo una vez y dejá la página abierta. Cada vez que digas <strong className="text-text">“Jarvis”</strong> te atiende;
          cuando termina la charla vuelve a quedar escuchando.
        </p>
      </header>

      <Card>
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <div
            aria-hidden
            className={`h-24 w-24 rounded-full border-2 transition-all ${
              state.kind === 'talking' ? 'animate-pulse border-accent bg-accent/20' :
              state.kind === 'waiting' ? 'border-accent-dim' :
              state.kind === 'connecting' ? 'animate-pulse border-accent-dim' :
              'border-hairline'
            }`}
          />
          <div>
            <p className="label" role="status">{STATUS[state.kind]}</p>
            {detail && <p className={`mt-1.5 text-sm ${state.kind === 'error' ? 'text-down' : 'text-text-dim'}`}>{detail}</p>}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {!active && (
              <button
                onClick={() => void jarvis.current?.enable()}
                className="label border border-accent-dim px-5 py-3 text-accent transition-colors hover:bg-accent hover:text-bg"
              >
                Activar Jarvis
              </button>
            )}
            {state.kind === 'waiting' && (
              <button onClick={() => void jarvis.current?.wake()} className="label border border-hairline px-5 py-3 text-text-dim hover:text-text">
                Hablar ahora
              </button>
            )}
            {state.kind === 'talking' && (
              <button onClick={() => void jarvis.current?.hangUp()} className="label border border-hairline px-5 py-3 text-text-dim hover:text-text">
                Colgar
              </button>
            )}
            {active && (
              <button onClick={() => void jarvis.current?.disable()} className="label px-5 py-3 text-text-faint hover:text-text">
                Apagar
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
