import type { MultiNumber, NumberingMode, ParsedHeading } from '../types.ts';
import type { NumberSystem } from './numberSystems/types.ts';
import { getDelimiterMatcher, getRecognitionDelimiters } from './delimiters.ts';
import type { Delimiter } from './delimiters.ts';

/**
 * 前导 emoji（含其后空白）。
 * 覆盖主流 emoji、ZWJ 组合、肤色修饰与变体选择符；冷门符号可能漏判。
 *
 * 组合符（ZWJ / 变体选择符 / 肤色修饰）不写进同一个字符类：那样会被
 * `no-misleading-character-class` 判为「字符类里的组合字符」，且语义容易误解，
 * 这里拆成并列分支，匹配效果与原来的字符类一致。
 */
export const EMOJI_PREFIX_RE =
  /^((?:[\p{Extended_Pictographic}\p{Emoji_Presentation}]|\u200D|\uFE0F|[\u{1F3FB}-\u{1F3FF}])+(?:\s+)?)/u;

const DECIMAL_CONTINUATION_RE = /^\d/;

/**
 * v0.0.8：单级模式下的「阿拉伯数字 + 空白」token（如 H1 的 `1 `）。
 * 仅接受 1..999（复用 arabic 体系的上限），避免把 `2024 年度总结` 当成编号。
 */
const BARE_ARABIC_TOKEN_RE = /^(\d+)\s+/;

/**
 * 多级编号 token：数字段以 `.` 连接，后面必须紧跟空白（至少一个）。
 * - single 模式：至少 2 段（`1.1 `、`1.1.1 `），用于多级 → 单级切换时剥掉旧编号；
 * - multi 模式：至少 1 段（额外识别 H1 的 `1 `），保证多级模式重复执行不叠加。
 * 「1.5倍速」这类后面没有空白的小数不会被识别。
 */
const MULTI_TOKEN_RES: Readonly<Record<NumberingMode, RegExp>> = {
  single: /^(\d+(?:\.\d+)+)\s+/,
  multi: /^(\d+(?:\.\d+)*)\s+/,
};

/** 标题是否已有编号（单级或多级任一） */
export function hasNumber(parsed: ParsedHeading): boolean {
  return parsed.number !== null || parsed.multiNumber !== null;
}

/** 尝试识别多级编号 token（`1 ` / `1.1 ` / `1.1.1 ` …） */
function parseMultiNumber(
  text: string,
  mode: NumberingMode,
): { multiNumber: MultiNumber; content: string } | null {
  const match = MULTI_TOKEN_RES[mode].exec(text);
  if (!match) return null;

  const raw = match[0];
  const path: number[] = [];
  for (const segment of (match[1] ?? '').split('.')) {
    path.push(Number.parseInt(segment, 10));
  }
  return { multiNumber: { path, raw }, content: text.slice(raw.length) };
}

/**
 * 解析标题文本为「emoji 前缀 + 编号 + 正文」。
 *
 * 识别顺序（parse 层不区分编号模式，只影响多级 token 的段数下限）：
 * 1. 多级 token（`1.1 ` 紧跟空白）—— 两种模式都识别；
 * 2. 单级 token（12 体系 × 13 字符分隔符），编号必须带可识别的分隔符，
 *    否则视为无编号（避免「三体问题」误判）；空格 / 无分隔符默认不参与识别（决策 #22）。
 * 3. v0.0.8：两种模式都识别「阿拉伯数字（1..999）+ 空白」的单级 token，
 *    保证 H1 的 `1 ` 能被删除/重排（多级模式下该 token 由多级分支处理）。
 */
export function parseHeading(
  titleText: string,
  systems: NumberSystem[],
  delimiters: readonly Delimiter[] = getRecognitionDelimiters(),
  mode: NumberingMode = 'single',
): ParsedHeading {
  let rest = titleText;
  let emojiPrefix = '';

  const emojiMatch = EMOJI_PREFIX_RE.exec(rest);
  if (emojiMatch) {
    emojiPrefix = emojiMatch[1] ?? '';
    rest = rest.slice(emojiPrefix.length);
  }

  const multi = parseMultiNumber(rest, mode);
  if (multi) {
    return { emojiPrefix, number: null, multiNumber: multi.multiNumber, content: multi.content };
  }

  // v0.0.8：`1 `（阿拉伯数字 + 空白）在单级模式下也视为编号。
  // 多级模式下已由 parseMultiNumber 处理，这里只补单级模式。
  if (mode === 'single') {
    const bare = BARE_ARABIC_TOKEN_RE.exec(rest);
    if (bare) {
      const digits = bare[1] ?? '';
      const arabic = systems.find((system) => system.id === 'arabic');
      const parsed = arabic?.parse(digits);
      if (parsed && parsed.consumed === digits.length) {
        const raw = bare[0] ?? '';
        return {
          emojiPrefix,
          number: { value: parsed.value, raw },
          multiNumber: null,
          content: rest.slice(raw.length),
        };
      }
    }
  }

  for (const delimiter of delimiters) {
    const matcher = getDelimiterMatcher(delimiter.id);
    if (!matcher) continue;

    let numberText = rest;
    if (matcher.prefixRe) {
      const prefixMatch = matcher.prefixRe.exec(numberText);
      if (!prefixMatch) continue;
      numberText = numberText.slice((prefixMatch[0] ?? '').length).replace(/^\s*/, '');
    }

    for (const system of systems) {
      const parsed = system.parse(numberText);
      if (!parsed) continue;

      const afterNumber = numberText.slice(parsed.consumed);
      const suffixMatch = matcher.suffixRe.exec(afterNumber);
      if (!suffixMatch) continue;

      const content = afterNumber.slice((suffixMatch[0] ?? '').length);

      // 「1.5倍速」这类小数/日期不当作编号
      if (
        (delimiter.suffix === '.' || delimiter.suffix === '．') &&
        DECIMAL_CONTINUATION_RE.test(content)
      ) {
        return { emojiPrefix, number: null, multiNumber: null, content: rest };
      }

      return {
        emojiPrefix,
        number: {
          value: parsed.value,
          raw: rest.slice(0, rest.length - content.length),
        },
        multiNumber: null,
        content,
      };
    }
  }

  return { emojiPrefix, number: null, multiNumber: null, content: rest };
}