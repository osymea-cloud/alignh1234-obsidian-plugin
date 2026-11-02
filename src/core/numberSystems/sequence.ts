/** 序列型编号体系的解析结果 */
export interface SequenceParseResult {
  /** 序号（1 起） */
  value: number;
  /** 从文本开头消耗掉的 UTF-16 长度 */
  consumed: number;
}

/**
 * 在文本开头匹配序列中的一个元素（元素均为单个 BMP 字符）。
 * 返回序号（1 起）与消耗长度；不匹配返回 null。
 */
export function parseSequencePrefix(
  text: string,
  sequence: readonly string[],
): SequenceParseResult | null {
  if (text.length === 0) return null;
  const ch = text.charAt(0);
  const index = sequence.indexOf(ch);
  if (index < 0) return null;
  return { value: index + 1, consumed: 1 };
}

/** 序号 → 序列元素；超出范围时回退为阿拉伯数字 */
export function formatSequence(n: number, sequence: readonly string[]): string {
  if (Number.isInteger(n) && n >= 1 && n <= sequence.length) {
    return sequence[n - 1] ?? String(n);
  }
  return String(n);
}

/** 双射 26 进制解析：A=1 … Z=26，AA=27 …；只接受 1-2 个字母，避免把单词当编号 */
export function parseBijectiveBase26(
  text: string,
  upperCase: boolean,
): SequenceParseResult | null {
  const match = (upperCase ? /^[A-Z]{1,2}/ : /^[a-z]{1,2}/).exec(text);
  if (!match) return null;
  const letters = match[0] ?? '';
  if (letters.length === 0) return null;
  const baseCode = upperCase ? 65 : 97;
  let value = 0;
  for (const ch of letters) {
    const code = ch.charCodeAt(0) - baseCode + 1;
    if (code < 1 || code > 26) return null;
    value = value * 26 + code;
  }
  return { value, consumed: letters.length };
}

/** 数值 → 双射 26 进制字符串（A-Z / a-z） */
export function formatBijectiveBase26(n: number, upperCase: boolean): string {
  if (!Number.isInteger(n) || n < 1) return String(n);
  const baseCode = upperCase ? 65 : 97;
  let value = n;
  let out = '';
  while (value > 0) {
    const rem = (value - 1) % 26;
    out = String.fromCharCode(baseCode + rem) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
}