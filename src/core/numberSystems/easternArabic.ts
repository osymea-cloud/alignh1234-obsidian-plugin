import type { NumberSystem } from './types.ts';

/** 东阿拉伯数字 ٠-٩（U+0660-U+0669） */
const EASTERN_ARABIC_DIGITS: readonly string[] = [
  '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩',
];
const MAX_NUMBER = 999;

export const easternArabicNumberSystem: NumberSystem = {
  id: 'eastern-arabic',
  parse(text) {
    const match = /^[٠-٩]+/.exec(text);
    if (!match) return null;
    const raw = match[0] ?? '';
    let value = 0;
    for (const ch of raw) {
      const digit = EASTERN_ARABIC_DIGITS.indexOf(ch);
      if (digit < 0) return null;
      value = value * 10 + digit;
    }
    if (value < 1 || value > MAX_NUMBER) return null;
    return { value, consumed: raw.length };
  },
  format(n) {
    let out = '';
    for (const ch of String(n)) {
      const digit = ch.charCodeAt(0) - 48;
      out += EASTERN_ARABIC_DIGITS[digit] ?? ch;
    }
    return out;
  },
};