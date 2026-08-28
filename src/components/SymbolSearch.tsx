'use client';

import { useEffect, useRef, useState } from 'react';
import type { SearchResponse } from '@/lib/api-types';

/**
 * Ticker autocomplete against Yahoo's search endpoint.
 * Debounced so typing does not fire a request per keystroke.
 */
export default function SymbolSearch({
  onPick, placeholder = 'Buscar ticker (AAPL, GGAL.BA, BTC-USD…)',
}: {
  onPick: (symbol: string, name: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse['results']>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clearing for a too-short query happens in onChange, not here: setting
    // state synchronously in an effect body causes cascading renders.
    const q = query.trim();
    if (q.length < 2) return;

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: SearchResponse) => {
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  function pick(symbol: string, name: string) {
    onPick(symbol, name);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <input
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          if (value.trim().length < 2) {
            setResults([]);
            setOpen(false);
          }
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          // Enter with no selection accepts the typed ticker as-is, so a symbol
          // Yahoo's search does not surface is still reachable.
          if (e.key === 'Enter' && query.trim()) {
            e.preventDefault();
            pick(results[0]?.symbol ?? query.trim().toUpperCase(), results[0]?.name ?? '');
          }
        }}
        placeholder={placeholder}
        className="w-full border border-hairline bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent-dim focus:outline-none"
      />
      {loading && <span className="label absolute right-3 top-3">…</span>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto border border-hairline-strong bg-surface shadow-xl">
          {results.map((r) => (
            <li key={r.symbol}>
              <button
                type="button"
                onClick={() => pick(r.symbol, r.name)}
                className="flex w-full items-baseline gap-3 px-3 py-2.5 text-left hover:bg-surface-2"
              >
                <span className="tnum text-sm text-text">{r.symbol}</span>
                <span className="truncate text-xs text-text-dim">{r.name}</span>
                <span className="label ml-auto shrink-0">{r.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
