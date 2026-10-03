import { describe, expect, it } from 'vitest';
import { hasWakeWord } from './wake';

describe('hasWakeWord', () => {
  it.each(['Jarvis', 'oye jarvis', 'Yarvis, ¿estás?', 'charvis', 'harvis', 'Jarvís', 'llarvis'])('detecta "%s"', (t) => {
    expect(hasWakeWord(t)).toBe(true);
  });

  it.each(['hola', 'jardín', 'servis', 'arvejas', 'travis scott'])('ignora "%s"', (t) => {
    expect(hasWakeWord(t)).toBe(false);
  });
});
