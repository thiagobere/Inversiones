'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
  return body as T;
}

/** GET a JSON endpoint, with a `reload()` to refetch after a mutation. */
export function useApi<T>(url: string | null): ApiState<T> {
  // The URL that produced the current data is stored alongside it, so `loading`
  // is derived rather than toggled — no setState inside the effect body.
  const [result, setResult] = useState<{ url: string | null; data: T | null; error: string | null }>({
    url: null, data: null, error: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    request<T>(url)
      .then((data) => {
        if (!cancelled) setResult({ url, data, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ url, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [url, nonce]);

  return {
    data: result.data,
    error: result.error,
    loading: url !== null && result.url !== url,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  };
}

/** POST/PATCH/DELETE helper that surfaces the API's error message. */
export async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((parsed as { error?: string }).error ?? `Error ${res.status}`);
  return parsed as T;
}
