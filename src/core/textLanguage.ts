import type { TitleLanguageId } from '../types.ts';
import { classifyLines, splitLines } from './markdownState.ts';

/**
 * 正文语言识别：判断文档正文主要使用的语言，供「标题语言：跟随文档」使用。
 *
 * 只靠 prompt 让模型「自行判断」时，提示词本身的语言（中文的「不超过 20 个字」之类）
 * 会把输出带偏，导致英文正文也生成中文标题；这里先在代码里判定一次，再把结论写死进 prompt。
 *
 * 判定顺序：假名 → 谚文 → 汉字/拉丁 → 西里尔 → 阿拉伯 → 拉丁字母细分。
 * 字符太少（短笔记、纯代码 / 表格）时返回 null，交回模型判断——宁可不判，也不瞎判。
 */

/** 各文字系统的字符计数 */
interface ScriptCounts {
  han: number;
  kana: number;
  hangul: number;
  cyrillic: number;
  arabic: number;
  latin: number;
}

/** 有效字母数少于该值时不判定（样本太短，结论不可靠） */
const MIN_LETTERS = 12;

/**
 * 拉丁字母语言判别用高频词。
 * 只取区分度高的词，避免 `de` / `la` 这类多语言共用的词互相干扰；
 * 列表顺序即优先级：同分时 `en` 胜出（拉丁字母的默认回退）。
 */
const LATIN_STOPWORDS: ReadonlyArray<readonly [TitleLanguageId, readonly string[]]> = [
  [
    'en',
    [
      'the',
      'and',
      'that',
      'this',
      'with',
      'from',
      'have',
      'will',
      'which',
      'about',
      'there',
      'their',
      'they',
      'been',
      'was',
      'were',
      'would',
      'should',
      'when',
      'what',
      'more',
      'than',
      'but',
      'not',
      'you',
    ],
  ],
  [
    'es',
    ['el', 'los', 'las', 'del', 'una', 'para', 'por', 'como', 'pero', 'más', 'este', 'esta', 'cuando', 'también', 'hay', 'son', 'muy', 'desde'],
  ],
  [
    'fr',
    ['les', 'des', 'est', 'dans', 'pour', 'avec', 'qui', 'pas', 'plus', 'cette', 'nous', 'vous', 'sont', 'être', 'aux', 'sur', 'leur', 'entre'],
  ],
  [
    'de',
    ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'mit', 'von', 'für', 'sich', 'auf', 'den', 'dem', 'des', 'wird', 'werden', 'auch', 'als', 'bei', 'aus'],
  ],
  [
    'pt',
    ['os', 'as', 'não', 'uma', 'com', 'mais', 'mas', 'dos', 'das', 'seu', 'sua', 'são', 'muito', 'você', 'pelo', 'pela', 'também'],
  ],
  [
    'it',
    ['gli', 'della', 'che', 'non', 'per', 'sono', 'questo', 'questa', 'anche', 'più', 'come', 'nel', 'nella', 'degli'],
  ],
];

/** 拉丁字母单词（含常见变音字母），用于高频词打分 */
const LATIN_WORD_RE = /[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]+/g;

/** 码点区间判断：区间数组按闭区间给出 */
function inRanges(code: number, ranges: ReadonlyArray<readonly [number, number]>): boolean {
  return ranges.some(([start, end]) => code >= start && code <= end);
}


const HAN_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xf900, 0xfaff],
  [0x20000, 0x2fa1f],
];

const KANA_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x3040, 0x309f],
  [0x30a0, 0x30ff],
  [0x31f0, 0x31ff],
  [0xff66, 0xff9d],
];

const HANGUL_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x11ff],
  [0x3130, 0x318f],
  [0xa960, 0xa97f],
  [0xac00, 0xd7af],
];

const CYRILLIC_RANGES: ReadonlyArray<readonly [number, number]> = [[0x0400, 0x052f]];

const ARABIC_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];

const LATIN_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0041, 0x005a],
  [0x0061, 0x007a],
  [0x00c0, 0x00d6],
  [0x00d8, 0x00f6],
  [0x00f8, 0x024f],
  [0x1e00, 0x1eff],
];

function countScripts(text: string): ScriptCounts {
  const counts: ScriptCounts = {
    han: 0,
    kana: 0,
    hangul: 0,
    cyrillic: 0,
    arabic: 0,
    latin: 0,
  };

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (inRanges(code, HAN_RANGES)) counts.han += 1;
    else if (inRanges(code, KANA_RANGES)) counts.kana += 1;
    else if (inRanges(code, HANGUL_RANGES)) counts.hangul += 1;
    else if (inRanges(code, CYRILLIC_RANGES)) counts.cyrillic += 1;
    else if (inRanges(code, ARABIC_RANGES)) counts.arabic += 1;
    else if (inRanges(code, LATIN_RANGES)) counts.latin += 1;
  }

  return counts;
}

/**
 * 只保留正文行（跳过 frontmatter / 围栏代码块），并去掉行内代码、图片、链接目标、
 * URL 与 HTML 标签——代码标识符与文件名会把拉丁字母计数拉高，导致语言判错。
 */
function extractPlainText(text: string): string {
  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  const kept: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (contexts[i]?.kind !== 'text') continue;
    kept.push(lines[i] ?? '');
  }

  return kept
    .join('\n')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!?\[\[[^\]]*\]\]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>\n]+>/g, ' ');
}

/** 拉丁字母：按高频词打分，取最高分的语言；都识别不出时按英文处理 */
function detectLatinLanguage(text: string): TitleLanguageId {
  const words = new Set(text.toLowerCase().match(LATIN_WORD_RE) ?? []);
  let best: TitleLanguageId = 'en';
  let bestScore = 0;

  for (const [id, stopwords] of LATIN_STOPWORDS) {
    let score = 0;
    for (const word of stopwords) {
      if (words.has(word)) score += 1;
    }
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }

  return best;
}

/**
 * 判断一段 Markdown 正文主要使用的语言。
 * 返回 11 种标题语言中的一种；样本不足或无法判断时返回 null。
 */
export function detectTextLanguage(text: string): TitleLanguageId | null {
  const plain = extractPlainText(text);
  const counts = countScripts(plain);
  const total =
    counts.han + counts.kana + counts.hangul + counts.cyrillic + counts.arabic + counts.latin;
  if (total < MIN_LETTERS) return null;

  // 日文：假名是强信号（中文正文里零星出现几个片假名不算）
  if (counts.kana >= 4 && counts.kana * 10 >= counts.han) return 'ja';
  // 韩文：谚文为主
  if (counts.hangul >= 4 && counts.hangul * 3 >= counts.han) return 'ko';

  // 中文技术文档常夹带大量英文标识符，所以用「汉字/拉丁比例」而不是直接比大小
  const cjk = counts.han + counts.kana + counts.hangul;
  if (cjk > 0 && cjk >= counts.latin * 0.35) {
    if (counts.kana > counts.han && counts.kana > counts.hangul) return 'ja';
    if (counts.hangul > counts.han) return 'ko';
    return 'zh';
  }

  if (counts.cyrillic >= 6 && counts.cyrillic >= counts.latin * 0.4) return 'ru';
  if (counts.arabic >= 6 && counts.arabic >= counts.latin * 0.4) return 'ar';
  if (counts.latin >= 6) return detectLatinLanguage(plain);
  return null;
}
