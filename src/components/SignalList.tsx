'use client';

import Link from 'next/link';
import { Badge, Empty } from '@/components/ui';
import type { Signal } from '@/lib/types';

const TONE = { strong: 'down', watch: 'warn', info: 'neutral' } as const;
const SEVERITY_LABEL = { strong: 'Atención', watch: 'Seguir', info: 'Contexto' } as const;

export default function SignalList({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return (
      <Empty
        title="Sin señales por ahora"
        hint="Las señales aparecen cuando un indicador cruza un umbral: RSI en zona extrema, medias móviles por cruzarse, concentración alta."
      />
    );
  }

  return (
    <ul className="space-y-5">
      {signals.map((s, i) => (
        <li key={`${s.title}-${i}`} className="border-l-2 border-hairline-strong pl-4">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={TONE[s.severity]}>{SEVERITY_LABEL[s.severity]}</Badge>
            <h3 className="text-sm text-text">
              {s.symbol ? (
                <Link href={`/asset/${encodeURIComponent(s.symbol)}`} className="hover:text-accent">{s.title}</Link>
              ) : (
                s.title
              )}
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-text-dim">{s.detail}</p>
          <p className="mt-1.5 text-xs text-text-faint">{s.basis}</p>
        </li>
      ))}
    </ul>
  );
}
