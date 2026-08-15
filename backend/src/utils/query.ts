/** Coerce an Express query value (string | ParsedQs | array) to a plain string. */
export function qs(value: unknown): string | undefined {
  if (typeof value === 'string' && value !== '') return value;
  return undefined;
}

export function qsNumber(value: unknown): number | undefined {
  const s = qs(value);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
