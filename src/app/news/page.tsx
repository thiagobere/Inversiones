'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, Empty, ErrorNote, Loading } from '@/components/ui';
import { fmtRelative } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { NewsResponse } from '@/lib/api-types';

type Scope = 'portfolio' | 'general';

export default function NewsPage() {
  const [scope, setScope] = useState<Scope>('portfolio');
  const news = useApi<NewsResponse>(`/api/news?scope=${scope}`);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="serif text-3xl tracking-tight">Noticias</h1>
          <p className="mt-1.5 text-sm text-text-dim">
            {scope === 'portfolio'
              ? 'Titulares de los activos que tenés en cartera o seguís.'
              : 'Panorama general de mercado.'}
          </p>
        </div>
        <div className="flex border border-hairline">
          {([['portfolio', 'Mis activos'], ['general', 'General']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setScope(value)}
              className={`label px-4 py-2.5 transition-colors ${
                scope === value ? 'bg-surface-2 text-accent' : 'text-text-dim hover:text-text'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {news.error && <ErrorNote message={news.error} />}

      <Card>
        {news.loading ? (
          <Loading label="Buscando titulares" />
        ) : news.data?.items.length === 0 ? (
          <Empty
            title="Sin noticias para mostrar"
            hint={scope === 'portfolio'
              ? 'Agregá posiciones o activos a seguimiento y acá vas a ver sus titulares.'
              : 'La fuente no devolvió resultados en este momento. Probá de nuevo en unos minutos.'}
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {news.data?.items.map((item) => (
              <li key={item.id} className="py-5 first:pt-0 last:pb-0">
                {/* The ticker chips are their own links, so they must sit outside
                    the headline anchor rather than nested inside it. */}
                <a href={item.link} target="_blank" rel="noopener noreferrer"
                  className="block leading-snug text-text transition-colors hover:text-accent">
                  {item.title}
                </a>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {item.symbols.map((s) => (
                    <Link key={s} href={`/asset/${encodeURIComponent(s)}`}
                      className="label border border-hairline-strong px-2 py-0.5 text-text-dim hover:border-accent-dim hover:text-accent">
                      {s}
                    </Link>
                  ))}
                  <span className="label">{item.publisher} · {fmtRelative(item.publishedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-text-faint">
        Titulares provistos por Yahoo Finance. Los enlaces abren el sitio de la fuente original.
      </p>
    </div>
  );
}
