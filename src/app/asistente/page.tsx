'use client';

import Script from 'next/script';
import { createElement } from 'react';

const AGENT_ID = 'agent_9901m40zk8avfdfbaj1h5xehnta2';

export default function AsistentePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="serif text-3xl tracking-tight">Asistente</h1>
        <p className="mt-1.5 text-sm text-text-dim">
          Tocá el botón de llamada abajo a la derecha y hablale. El navegador te va a pedir permiso para usar el micrófono.
        </p>
      </header>

      {/* Custom element del widget de ElevenLabs; createElement evita declarar su tipo JSX. */}
      {createElement('elevenlabs-convai', { 'agent-id': AGENT_ID })}
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" strategy="afterInteractive" />
    </div>
  );
}
