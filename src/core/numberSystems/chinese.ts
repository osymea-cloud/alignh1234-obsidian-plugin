import type { NumberParseResult, NumberSystem } from './types.ts';

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 个位到千位的单位，索引与 fourDigitsToChinese 中的位权对应 */
const SMALL_UNITS = ['', '十', '百', '千'];
const BIG_UNITS = ['', '万', '亿', '兆'];

const CN_NUM: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};
const CN_UNIT: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
const CN_BIG: Record<string, number> = { 万: 10000, 亿: 100000000, 兆: 1000000000000 };

const CN_NUMERAL_CHARS = '零〇一二三四五六七八九十百千万亿兆两';
const NUMERAL_RUN = new RegExp(`^(第\\s*)?([${CN_NUMERAL_CHARS}]+)`);

/** 把 1..9999 的四位分组转成中文（不加「万/亿」等大单位） */
function fourDigitsToChinese(section: number): string {
  const digits = [
    Math.floor(section / 1000),
    Math.floor(section / 100) % 10,
    Math.floor(section / 10) % 10,
    section % 10,
  ];
  let out = '';
  let pendingZero = false;
  let started = false;

  for (let i = 0; i < 4; i += 1) {
    const d = digits[i] ?? 0;
    if (d === 0) {
      if (started) pendingZero = true;
      continue;
    }
    if (pendingZero) {
      out += '零';
      pendingZero = false;
    }
    out += (CN_DIGITS[d] ?? '') + (SMALL_UNITS[3 - i] ?? '');
    started = true;
  }

  return out;
}

/** 正整数 → 中文数字；支持到「兆」级 */
export function numberToChinese(input: number): string {
  if (!Number.isFinite(input)) throw new Error(`无法转换数字：${input}`);
  let n = Math.trunc(input);
  if (n === 0) return '零';
  if (n < 0) return `负${numberToChinese(-n)}`;

  const sections: number[] = [];
  while (n > 0) {
    sections.push(n % 10000);
    n = Math.floor(n / 10000);
  }
  if (sections.length > BIG_UNITS.length) {
    throw new Error(`数字过大，暂不支持：${input}`);
  }

  let out = '';
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const section = sections[i] ?? 0;
    if (section === 0) {
      let hasLower = false;
      for (let j = i - 1; j >= 0; j -= 1) {
        if ((sections[j] ?? 0) !== 0) {
          hasLower = true;
          break;
        }
      }
      if (hasLower && out !== '' && !out.endsWith('零')) out += '零';
      continue;
    }
    if (out !== '' && section < 1000 && !out.endsWith('零')) out += '零';
    out += fourDigitsToChinese(section) + (BIG_UNITS[i] ?? '');
  }

  // 「一十」在词首读作「十」：10 → 十、11 → 十一、十一万 → 十一万
  if (out.startsWith('一十')) out = out.slice(1);
  return out;
}

/** 中文数字 → 数值；无法解析返回 null */
export function chineseToNumber(text: string): number | null {
  if (text.length === 0) return null;

  let total = 0;
  let section = 0;
  let digit = 0;
  let seen = false;

  for (const ch of text) {
    const num = CN_NUM[ch];
    if (num !== undefined) {
      digit = num;
      seen = true;
      continue;
    }
    const unit = CN_UNIT[ch];
    if (unit !== undefined) {
      // 「十」前面没有数字时按「一十」处理
      if (digit === 0) digit = 1;
      section += digit * unit;
      digit = 0;
      seen = true;
      continue;
    }
    const big = CN_BIG[ch];
    if (big !== undefined) {
      section += digit;
      digit = 0;
      if (section === 0) section = 1;
      total += section * big;
      section = 0;
      seen = true;
      continue;
    }
    return null;
  }

  total += section + digit;
  return seen ? total : null;
}

export const chineseNumberSystem: NumberSystem = {
  id: 'chinese',
  parse(text: string): NumberParseResult | null {
    const match = NUMERAL_RUN.exec(text);
    if (!match) return null;
    const value = chineseToNumber(match[2] ?? '');
    if (value === null) return null;
    return { value, consumed: (match[0] ?? '').length };
  },
  format(n: number): string {
    return numberToChinese(n);
  },
};
