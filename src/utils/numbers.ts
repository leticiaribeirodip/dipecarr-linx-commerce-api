/**
 * Converte um valor de query string / body em inteiro dentro de [min, max].
 *
 * Number('abc') é NaN e NaN sobrevive a Math.min/Math.max, o que fazia
 * `slice(0, NaN)` devolver lista vazia e `Array.from({ length: NaN })` gerar
 * zero produtos. Aqui qualquer entrada inválida cai no fallback.
 */
export function parseBoundedInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  const base = Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
  return Math.min(Math.max(base, min), max);
}
