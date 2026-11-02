import type { NumberParseResult, NumberSystem } from './types.ts';

/**
 * 阿拉伯数字上限：超过该值不视为标题编号。
 * 用于避免把「2024.总结」这类年份误判成编号 2024。
 */
const MAX_ARABIC_HEADING_NUMBER = 999;

export const arabicNumberSystem: NumberSystem = {
  id: 'arabic',
  parse(text: string): NumberParseResult | null {
    const match = /^(\d+)/.exec(text);
    if (!match) return null;
    const value = Number.parseInt(match[1] ?? '', 10);
    if (!Number.isFinite(value) || value < 1 || value > MAX_ARABIC_HEADING_NUMBER) {
      return null;
    }
    return { value, consumed: (match[0] ?? '').length };
  },
  format(n: number): string {
    return String(n);
  },
};
