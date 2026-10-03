/**
 * Detección de la palabra de activación. El reconocedor en español rara vez
 * escribe "jarvis" tal cual: suele devolver "yarvis", "charvis", "harvis", etc.,
 * así que aceptamos esas variantes en vez de exigir la grafía exacta.
 */
const WAKE_VARIANTS = /\b(j|y|ll|ch|h|sh|g)?arv[ie]s?\b|\bjarvi\b|\bjervis\b/;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ');
}

export function hasWakeWord(transcript: string): boolean {
  return WAKE_VARIANTS.test(normalize(transcript));
}
