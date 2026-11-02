import type { NumberParseResult, NumberSystem } from './types.ts';

/** 标准罗马数字：1..3999 */
const ROMAN_VALID_RE = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

function parseRoman(text: string, upperCase: boolean): NumberParseResult | null {
  const match = (upperCase ? /^[IVXLCDM]+/ : /^[ivxlcdm]+/).exec(text);
  if (!match) return null;
  const raw = match[0] ?? '';
  const normalized = upperCase ? raw : raw.toUpperCase();
  if (!ROMAN_VALID_RE.test(normalized)) return null;

  let total = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    const current = ROMAN_VALUES[normalized.charAt(i)] ?? 0;
    const next = ROMAN_VALUES[normalized.charAt(i + 1)] ?? 0;
    total += current < next ? -current : current;
  }
  if (total < 1 || total > 3999) return null;
  return { value: total, consumed: raw.length };
}

function formatRoman(n: number, upperCase: boolean): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return String(n);
  const table: ReadonlyArray<readonly [number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let value = n;
  let out = '';
  for (const [amount, symbol] of table) {
    while (value >= amount) {
      out += symbol;
      value -= amount;
    }
  }
  return upperCase ? out : out.toLowerCase();
}

export const romanUpperNumberSystem: NumberSystem = {
  id: 'roman-upper',
  parse(text) {
    return parseRoman(text, true);
  },
  format(n) {
    return formatRoman(n, true);
  },
};

export const romanLowerNumberSystem: NumberSystem = {
  id: 'roman-lower',
  parse(text) {
    return parseRoman(text, false);
  },
  format(n) {
    return formatRoman(n, false);
  },
};