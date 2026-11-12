import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DOC_PATTERN = /^(?:aula-\d{3}|lab-\d{2})$/;

/**
 * Reads a slide document (`aula-NNN.txt` or `lab-0N.txt`) and splits it on
 * form feeds. Slide N is the chunk at index N - 1.
 *
 * Returns null when the file does not exist.
 */
export function loadSlides(dir: string, doc: string): string[] | null {
  if (!DOC_PATTERN.test(doc)) {
    throw new Error(`Documento inválido: ${doc} (use aula-NNN ou lab-0N)`);
  }
  const file = join(dir, `${doc}.txt`);
  if (!existsSync(file)) {
    return null;
  }
  return readFileSync(file, 'utf8').split('\f');
}

/** NFC, lowercase, collapsed whitespace and unified quotes. */
export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″«»]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when `evidence` occurs in slide number `slide` (1-based). */
export function hasEvidence(
  slides: readonly string[],
  slide: number,
  evidence: string,
): boolean {
  const source = slides[slide - 1];
  if (source === undefined) {
    return false;
  }
  return normalize(source).includes(normalize(evidence));
}
