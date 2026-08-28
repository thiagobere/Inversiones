'use client';

import { useState } from 'react';
import { Card, ErrorNote } from '@/components/ui';
import { fmtRelative } from '@/lib/format';
import { mutate } from '@/lib/useApi';
import type { AiResponse } from '@/lib/api-types';

/** Minimal markdown rendering for the headings and bullets the prompt asks for. */
function Rendered({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (t.startsWith('## ')) {
          return <h3 key={i} className="label pt-2">{t.slice(3)}</h3>;
        }
        if (t.startsWith('- ') || t.startsWith('* ')) {
          return (
            <p key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-dim">
              <span className="text-accent">·</span>
              <span>{t.slice(2)}</span>
            </p>
          );
        }
        return <p key={i} className="text-sm leading-relaxed text-text-dim">{t}</p>;
      })}
    </div>
  );
}

export default function AiAnalysis() {
  const [result, setResult] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult(await mutate<AiResponse>('/api/insights/ai', 'POST'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Análisis con IA"
      action={
        <button onClick={run} disabled={loading}
          className="label border border-accent-dim px-3 py-2 text-accent transition-colors hover:bg-accent hover:text-bg disabled:opacity-40">
          {loading ? 'Analizando…' : result ? 'Regenerar' : 'Analizar'}
        </button>
      }
    >
      {error && <ErrorNote message={error} />}

      {!result && !error && !loading && (
        <p className="text-sm leading-relaxed text-text-dim">
          Le pasa a Claude tu portafolio, las señales ya calculadas y los titulares recientes, y
          devuelve un resumen en texto. Trabaja solo con esos datos: no busca información por su
          cuenta ni recomienda comprar o vender.
        </p>
      )}

      {result && (
        <>
          <Rendered text={result.analysis} />
          <p className="mt-5 border-t border-hairline pt-3 text-xs text-text-faint">
            Generado {fmtRelative(result.generatedAt)} · {result.model} · Información general, no
            asesoramiento financiero.
          </p>
        </>
      )}
    </Card>
  );
}
