import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/** Uniform error shape so the UI can always read `.error`. */
export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handle<T>(fn: () => Promise<T> | T) {
  return Promise.resolve()
    .then(fn)
    .then((data) => NextResponse.json(data))
    .catch((err: unknown) => {
      if (err instanceof ZodError) {
        return fail(err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '), 422);
      }
      console.error('[api]', err);
      return fail(err instanceof Error ? err.message : 'Error inesperado', 500);
    });
}
