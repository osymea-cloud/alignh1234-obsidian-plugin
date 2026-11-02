/**
 * 分隔符注册表。
 *
 * 识别集：13 种字符分隔符（11 种后缀 + 2 种包裹）。
 * 生成集：15 种（额外支持「无分隔符」「空格」）。
 * 空格 / 无分隔符只用于生成，不参与识别（决策 #22）。
 */

export interface Delimiter {
  /** 稳定 id，保存在设置里 */
  id: string;
  /** 编号前的固定前缀（包裹型用；后缀型为空串） */
  prefix: string;
  /** 编号后的固定后缀（空串表示无分隔符） */
  suffix: string;
  /** 中文名称 */
  nameZh: string;
  /** 英文名称 */
  nameEn: string;
}

/** 识别分隔符时使用的预编译正则 */
export interface DelimiterMatcher {
  delimiter: Delimiter;
  /** 前缀正则（包裹型；后缀型为 null） */
  prefixRe: RegExp | null;
  /** 后缀正则：可选空白 + 固定后缀 + 可选空白 */
  suffixRe: RegExp;
}

export const DELIMITERS: readonly Delimiter[] = [
  { id: 'dunhao', prefix: '', suffix: '、', nameZh: '顿号', nameEn: 'Dunhao' },
  { id: 'period-full', prefix: '', suffix: '．', nameZh: '全角句点', nameEn: 'Full-width period' },
  { id: 'period', prefix: '', suffix: '.', nameZh: '半角句点', nameEn: 'Period' },
  { id: 'paren-right-full', prefix: '', suffix: '）', nameZh: '全角右括号', nameEn: 'Full-width right parenthesis' },
  { id: 'paren-right', prefix: '', suffix: ')', nameZh: '半角右括号', nameEn: 'Right parenthesis' },
  { id: 'colon-full', prefix: '', suffix: '：', nameZh: '全角冒号', nameEn: 'Full-width colon' },
  { id: 'colon', prefix: '', suffix: ':', nameZh: '半角冒号', nameEn: 'Colon' },
  { id: 'middle-dot', prefix: '', suffix: '·', nameZh: '间隔号', nameEn: 'Middle dot' },
  { id: 'middle-dot-katakana', prefix: '', suffix: '・', nameZh: '片假名中点', nameEn: 'Katakana middle dot' },
  { id: 'em-dash', prefix: '', suffix: '—', nameZh: '破折号', nameEn: 'Em dash' },
  { id: 'arabic-decimal', prefix: '', suffix: '٫', nameZh: '阿拉伯小数点', nameEn: 'Arabic decimal separator' },
  { id: 'paren-full', prefix: '（', suffix: '）', nameZh: '全角括号', nameEn: 'Full-width parentheses' },
  { id: 'paren', prefix: '(', suffix: ')', nameZh: '半角括号', nameEn: 'Parentheses' },
  { id: 'none', prefix: '', suffix: '', nameZh: '无分隔符', nameEn: 'No delimiter' },
  { id: 'space', prefix: '', suffix: ' ', nameZh: '空格', nameEn: 'Space' },
];

export const DEFAULT_DELIMITER_ID = 'dunhao';

const BY_ID = new Map<string, Delimiter>(
  DELIMITERS.map((delimiter): [string, Delimiter] => [delimiter.id, delimiter]),
);

export function getDelimiter(id: string): Delimiter | null {
  return BY_ID.get(id) ?? null;
}

export function isDelimiterId(id: string): boolean {
  return BY_ID.has(id);
}

/** 旧版单字符分隔符 → 新 id（设置迁移用） */
const LEGACY_CHAR_TO_ID: Readonly<Record<string, string>> = {
  '、': 'dunhao',
  '．': 'period-full',
  '.': 'period',
  '）': 'paren-right-full',
  ')': 'paren-right',
  '：': 'colon-full',
  ':': 'colon',
  '·': 'middle-dot',
};

export function delimiterIdFromLegacyChar(char: string): string | null {
  return LEGACY_CHAR_TO_ID[char] ?? null;
}

/** 仅生成用的分隔符，不参与识别 */
const GENERATION_ONLY_IDS: ReadonlySet<string> = new Set(['none', 'space']);

/** 识别集：包裹型优先，随后是后缀型 */
const RECOGNITION_DELIMITERS: readonly Delimiter[] = [
  ...DELIMITERS.filter((delimiter) => delimiter.prefix.length > 0),
  ...DELIMITERS.filter(
    (delimiter) =>
      delimiter.prefix.length === 0 &&
      delimiter.suffix.length > 0 &&
      !GENERATION_ONLY_IDS.has(delimiter.id),
  ),
];

export function getRecognitionDelimiters(): readonly Delimiter[] {
  return RECOGNITION_DELIMITERS;
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 空格后缀需要特殊处理：普通模式会把空格本身也吃掉 */
function buildSuffixPattern(delimiter: Delimiter): string {
  if (delimiter.suffix === '') return '^\\s*';
  if (delimiter.suffix === ' ') return '^\\s+';
  return `^\\s*${escapeRegExp(delimiter.suffix)}\\s*`;
}

const MATCHERS = new Map<string, DelimiterMatcher>(
  DELIMITERS.map((delimiter): [string, DelimiterMatcher] => [
    delimiter.id,
    {
      delimiter,
      prefixRe:
        delimiter.prefix.length > 0
          ? new RegExp(`^\\s*${escapeRegExp(delimiter.prefix)}`)
          : null,
      suffixRe: new RegExp(buildSuffixPattern(delimiter)),
    },
  ]),
);

export function getDelimiterMatcher(id: string): DelimiterMatcher | null {
  return MATCHERS.get(id) ?? null;
}