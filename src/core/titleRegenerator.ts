import type {
  HeadingLevel,
  H1RenumberSettings,
  TitleLevelConfig,
  TitleSettings,
} from '../types.ts';
import { HEADING_LEVELS, defaultGenerationPrompt, defaultThemePrompt } from '../types.ts';
import { scanHeadings, splitLines } from './documentScanner.ts';
import { classifyLines } from './markdownState.ts';
import { EMOJI_PREFIX_RE, parseHeading } from './headingParser.ts';
import { getAllNumberSystems } from './numberSystems/index.ts';
import { getRecognitionDelimiters } from './delimiters.ts';
import { getTitleLanguage } from './titleLanguage.ts';

/** 每节正文发给 LLM 的最大字符数（超长文档兜底） */
export const MAX_SECTION_BODY_CHARS = 1600;

/** 一个标题节点：只保留生成标题需要的字段 */
export interface HeadingNode {
  /** 标题级别（H1-H4） */
  level: HeadingLevel;
  /** 标题所在行号（0 起） */
  lineIndex: number;
  /** 行首到标题文本之前的原始前缀，例如 "# " / "  ### " */
  prefix: string;
  /** 标题文本前的前导 emoji（含其后空白） */
  emojiPrefix: string;
  /** 去掉 emoji 与旧编号后的现有标题正文 */
  title: string;
  /** 该标题下的正文（到下一个同级/更浅标题；跳过 frontmatter 与代码块） */
  body: string;
}

export interface TitleApplyResult {
  text: string;
  changedCount: number;
}

/** LLM 为单个标题返回的结构化内容 */
export interface GeneratedTitle {
  /** 提示性 emoji（已归一化；无则空串） */
  emoji: string;
  /** 讨论主题（不含编号/冒号） */
  theme: string;
  /** 一句话总结（不含前导冒号） */
  summary: string;
}

/** buildPrompt 需要的设置子集（真实设置对象可直接传入） */
export type TitlePromptSettings = Pick<H1RenumberSettings, 'language' | 'title'>;

/** 三开关全关的标题级别（用于设置校验） */
export function getInvalidTitleLevels(title: TitleSettings): HeadingLevel[] {
  return HEADING_LEVELS.filter((level) => {
    const config = title.levels[level];
    return !config.includeEmoji && !config.includeTheme && !config.includeSummary;
  });
}

/** 标题设置是否可用：任一级三开关全关 → false */
export function validateTitleSettings(title: TitleSettings): boolean {
  return getInvalidTitleLevels(title).length === 0;
}

const systems = getAllNumberSystems();
const delimiters = getRecognitionDelimiters();

function normalizeBody(raw: string): string {
  const body = raw.replace(/\n{3,}/g, '\n\n').trim();
  if (body.length <= MAX_SECTION_BODY_CHARS) return body;
  return `${body.slice(0, MAX_SECTION_BODY_CHARS).trimEnd()}…`;
}

/**
 * 抽取文档大纲（仅 H1-H4）。
 * - 标题正文去掉 emoji 与旧编号，emoji 单独保存；
 * - body 到下一个同级/更浅标题为止，跳过 frontmatter 与围栏代码块；
 * - 每节正文按 MAX_SECTION_BODY_CHARS 截断，避免超长文档把 prompt 撑爆。
 */
export function extractDocumentOutline(text: string): HeadingNode[] {
  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  const headings = scanHeadings(lines);
  const outline: HeadingNode[] = [];

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    if (!heading) continue;

    // 下一个同级/更浅标题（含父级的完整子树正文）
    let nextLine = lines.length;
    for (let k = i + 1; k < headings.length; k += 1) {
      const next = headings[k];
      if (next && next.level <= heading.level) {
        nextLine = next.lineIndex;
        break;
      }
    }

    const bodyLines: string[] = [];
    for (let line = heading.lineIndex + 1; line < nextLine; line += 1) {
      if (contexts[line]?.kind !== 'text') continue;
      bodyLines.push(lines[line] ?? '');
    }

    const parsed = parseHeading(heading.titleText, systems, delimiters);
    outline.push({
      level: heading.level,
      lineIndex: heading.lineIndex,
      prefix: heading.prefix,
      emojiPrefix: parsed.emojiPrefix,
      title: parsed.content.trim(),
      body: normalizeBody(bodyLines.join('\n')),
    });
  }

  return outline;
}

/** 某一级别启用的字段（用于 prompt 说明） */
function levelFields(level: HeadingLevel, config: TitleLevelConfig, isZh: boolean): string {
  const fields: string[] = [];
  if (config.includeEmoji) fields.push('emoji');
  if (config.includeTheme) fields.push('theme');
  if (config.includeSummary) fields.push('summary');
  return `H${level}${isZh ? '：' : ': '}${fields.join(isZh ? '、' : ', ')}`;
}

/** 标题语言指令：document 由模型推断，custom 固定语言 */
function languageDirective(title: TitleSettings, isZh: boolean): string {
  if (title.languageMode === 'custom') {
    const language = getTitleLanguage(title.customLanguage);
    return isZh
      ? `使用${language.nameZh}（${language.promptName}）输出 theme 与 summary`
      : `Write theme and summary in ${language.promptName}`;
  }
  return isZh
    ? '使用文档正文主要使用的语言输出 theme 与 summary（自动判断，无需询问）'
    : 'Write theme and summary in the language primarily used by the document body (infer it automatically)';
}

/** 「一句话总结」的生成要求（空 → 按界面语言回退默认） */
function summaryRequirement(settings: TitlePromptSettings): string {
  const custom = settings.title.generationPrompt.trim();
  return custom || defaultGenerationPrompt(settings.language);
}

/** 「讨论主题」的生成要求（空 → 按界面语言回退默认） */
function themeRequirement(settings: TitlePromptSettings): string {
  const custom = settings.title.themePrompt.trim();
  return custom || defaultThemePrompt(settings.language);
}

function zhInstructions(outline: HeadingNode[], settings: TitlePromptSettings): string {
  const levels = HEADING_LEVELS.map((level) =>
    `- ${levelFields(level, settings.title.levels[level], true)}`,
  ).join('\n');

  return [
    '你是 Markdown 文档大纲编辑。请根据每个标题下的正文，为每个标题重新生成标题。',
    '要求：',
    `1. 只输出一个 JSON 数组，元素数量必须等于 ${outline.length}，顺序与输入一致；每个元素形如 {"emoji":"…","theme":"…","summary":"…"}，不要输出解释或代码围栏。`,
    '2. 按标题级别决定输出字段；未启用的字段返回空字符串 ""：',
    levels,
    `3. theme 为「讨论主题」：${themeRequirement(settings)}（尽量不超过 7 个汉字；不要加编号或冒号前缀）。`,
    `4. summary 为「一句话总结」：${summaryRequirement(settings)}（遵循上述要求；不要包含冒号前缀）。`,
    '5. emoji：有趣、与正文内容相关、尽量丰富多样（关键要求）；只放一个 emoji，不要文字。',
    `6. 语言：${languageDirective(settings.title, true)}。`,
    '7. 父标题不要赘述子标题已经总结的内容，侧重说明多个子标题之间的区别与整体概括；子标题专注自身，不要重复父标题。',
    '8. 目标是让标题本身构成文档大纲，正文只作为补充。',
  ].join('\n');
}

function enInstructions(outline: HeadingNode[], settings: TitlePromptSettings): string {
  const levels = HEADING_LEVELS.map((level) =>
    `- ${levelFields(level, settings.title.levels[level], false)}`,
  ).join('\n');

  return [
    'You are a Markdown outline editor. Regenerate each heading from the body under it.',
    'Requirements:',
    `1. Output only a JSON array with exactly ${outline.length} elements in input order; each element looks like {"emoji":"…","theme":"…","summary":"…"}. No explanations or code fences.`,
    '2. Emit fields according to the heading level; return "" for disabled fields:',
    levels,
    `3. theme is the discussion topic: ${themeRequirement(settings)} (ideally no more than 7 words; do not prefix it with a number or colon).`,
    `4. summary is the one-sentence summary: ${summaryRequirement(settings)} (follow the requirement above; do not prefix it with a colon).`,
    '5. emoji: fun, relevant to the body, and varied (key requirement); exactly one emoji, no text.',
    `6. Language: ${languageDirective(settings.title, false)}.`,
    '7. A parent heading must not repeat what its child headings already summarize; focus on the differences between child sections and the overall picture. Child headings should focus on their own content and not repeat the parent.',
    '8. The headings themselves should form the document outline; body text is supplementary.',
  ].join('\n');
}

/**
 * 组一次标题生成 prompt（结构化大纲 + 语言 + 逐级字段 + 生成提示词）。
 * 整篇一次调用，保证父标题能看到全部子标题并做非冗余概括。
 */
export function buildPrompt(outline: HeadingNode[], settings: TitlePromptSettings): string {
  const isZh = settings.language === 'zh';
  const parts: string[] = [
    isZh ? zhInstructions(outline, settings) : enInstructions(outline, settings),
  ];

  parts.push(
    isZh ? `大纲（共 ${outline.length} 个标题）：` : `Outline (${outline.length} headings):`,
  );

  outline.forEach((node, index) => {
    const title = node.title || (isZh ? '（无）' : '(none)');
    const body = node.body || (isZh ? '（无正文）' : '(no body)');
    const header = isZh
      ? `[${index + 1}] H${node.level} 现有标题：${title}`
      : `[${index + 1}] H${node.level} Current title: ${title}`;
    const bodyLabel = isZh ? '正文：' : 'Body:';
    parts.push(`${header}\n${bodyLabel}\n${body}`);
  });

  parts.push(
    isZh
      ? `请只返回长度为 ${outline.length} 的 JSON 数组，元素为 {"emoji","theme","summary"} 对象。`
      : `Return only a JSON array of ${outline.length} objects with keys "emoji", "theme" and "summary".`,
  );

  return parts.join('\n\n');
}

/** 旧版纯字符串条目（如「🚀 主题：总结」）解析为结构化对象 */
function parseLegacyTitle(raw: string): GeneratedTitle {
  let text = cleanLegacyTitle(raw);
  if (!text) return { emoji: '', theme: '', summary: '' };

  let emoji = '';
  const match = EMOJI_PREFIX_RE.exec(text);
  if (match) {
    emoji = (match[0] ?? '').trim();
    text = text.slice((match[0] ?? '').length).trim();
  }

  const colon = text.search(/[：:]/);
  if (colon >= 0) {
    return {
      emoji,
      theme: text.slice(0, colon).trim(),
      summary: text.slice(colon + 1).trim(),
    };
  }
  return { emoji, theme: text.trim(), summary: '' };
}

/** 单项归一化：对象缺失字段回退空串；字符串按旧格式兼容；其他类型视为解析失败 */
function normalizeEntry(value: unknown): GeneratedTitle | null {
  if (typeof value === 'string') return parseLegacyTitle(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const themeCandidate = record.theme ?? record.title ?? record.heading ?? record.text;
  return {
    emoji: typeof record.emoji === 'string' ? record.emoji : '',
    theme: typeof themeCandidate === 'string' ? themeCandidate : '',
    summary: typeof record.summary === 'string' ? record.summary : '',
  };
}

function normalizeEntries(value: unknown): GeneratedTitle[] | null {
  if (!Array.isArray(value)) return null;
  const titles: GeneratedTitle[] = [];
  for (const item of value) {
    const entry = normalizeEntry(item);
    if (!entry) return null;
    titles.push(entry);
  }
  return titles;
}

function tryParseEntries(text: string): GeneratedTitle[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    const direct = normalizeEntries(parsed);
    if (direct) return direct;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const nested = normalizeEntries(record.titles);
      if (nested) return nested;
    }
  } catch {
    return null;
  }
  return null;
}

function extractJsonArray(raw: string): GeneratedTitle[] | null {
  const direct = tryParseEntries(raw.trim());
  if (direct) return direct;

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  if (fenced?.[1]) {
    const entries = tryParseEntries(fenced[1].trim());
    if (entries) return entries;
  }

  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start >= 0 && end > start) {
    const entries = tryParseEntries(raw.slice(start, end + 1));
    if (entries) return entries;
  }

  return null;
}

/** 逐行列表回退：只接受「列表项 / 编号项 / 带引号的行」，避免把一段解释当成标题 */
function parseListFallback(raw: string, count: number): GeneratedTitle[] | null {
  const titles: GeneratedTitle[] = [];
  let listLike = 0;

  for (const rawLine of raw.split('\n')) {
    let line = rawLine.trim();
    if (!line) continue;
    if (/^```/.test(line) || /^[[\]{},]+$/.test(line)) continue;

    const marker = /^(?:[-*+]|\d+[.)、．])\s+/.exec(line);
    if (marker) {
      listLike += 1;
      line = line.slice(marker[0].length).trim();
    } else if (line.startsWith('"') && line.endsWith('"')) {
      listLike += 1;
    } else {
      return null;
    }

    if (line.startsWith('"') && line.endsWith('"')) {
      try {
        line = String(JSON.parse(line));
      } catch {
        // 保留原样
      }
    }

    line = line.replace(/,$/, '').trim();
    line = line.replace(/^["'“”‘’`]+/, '').replace(/["'“”‘’`]+$/, '').trim();
    if (line) titles.push(parseLegacyTitle(line));
  }

  if (listLike === 0) return null;
  return titles.length === count ? titles : null;
}

/**
 * 解析 LLM 返回的结构化标题数组。
 * 依次尝试：直接 JSON → 代码围栏内 JSON → 首个 [ 到末个 ] → 逐行列表回退。
 * 数量与标题数不一致时抛错，调用方应放弃本次写入（避免错位覆盖）。
 */
export function parseTitlesResponse(raw: string, count: number): GeneratedTitle[] {
  const entries = extractJsonArray(raw);
  if (entries) {
    if (entries.length !== count) {
      throw new Error(`标题数量不符：期望 ${count}，实际 ${entries.length}`);
    }
    return entries;
  }

  const fallback = parseListFallback(raw, count);
  if (fallback) return fallback;

  throw new Error('无法解析 AI 返回的标题列表');
}

/** 去掉代码围栏/引号/列表符号，但保留前导 emoji（供旧格式解析） */
function cleanLegacyTitle(raw: string): string {
  let title = raw.trim();
  if (!title) return '';

  title = title.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  title = title.replace(/^["'“”‘’「」『』`]+/, '').replace(/["'“”‘’「」『』`]+$/, '').trim();
  title = title.replace(/^#{1,6}\s+/, '').trim();
  // v0.0.8：同时剥离「阿拉伯数字 + 空白」的旧编号（如 `1 主题：总结`）
  title = title
    .replace(/^(?:[-*+]|\d+[.)、．]|[一二三四五六七八九十]+[、.．]|\d+)\s+/, '')
    .trim();
  title = title.replace(/\s*\n+\s*/g, ' ').trim();
  return title;
}

/**
 * 清理模型输出：去引号/代码围栏/列表编号/自带 emoji，多行折叠为单行。
 * 返回空串时调用方保留原标题（v0.0.6 兼容入口）。
 */
export function sanitizeGeneratedTitle(raw: string): string {
  let title = cleanLegacyTitle(raw);
  if (!title) return '';

  const emoji = EMOJI_PREFIX_RE.exec(title);
  if (emoji) title = title.slice((emoji[0] ?? '').length).trim();

  // 去掉列表符号/emoji 后可能暴露新的引号
  title = title.replace(/^["'“”‘’「」『』`]+/, '').replace(/["'“”‘’「」『』`]+$/, '').trim();
  return title;
}

/** 清理主题/总结：去围栏、引号、换行，保留正文 */
function cleanField(raw: string): string {
  return raw
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/^["'“”‘’「」『』`]+/, '')
    .replace(/["'“”‘’「」『』`]+$/, '')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();
}

/** 归一化 LLM emoji：只接受开头匹配到的一个 emoji；空/非法 → 空串 */
export function normalizeEmoji(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  const match = EMOJI_PREFIX_RE.exec(text);
  return match ? (match[0] ?? '').trim() : '';
}

/**
 * 按级别三开关组装标题（决策 #46/#47）：
 * - emoji 后恰好一个空格；
 * - 冒号只在 theme 非空时出现；
 * - 结果 trim；空串表示不覆盖。
 */
export function composeTitle(config: TitleLevelConfig, item: GeneratedTitle): string {
  const emoji = config.includeEmoji ? normalizeEmoji(item.emoji) : '';
  const theme = config.includeTheme ? cleanField(item.theme).replace(/[：:]\s*$/, '').trim() : '';
  const summary = config.includeSummary
    ? cleanField(item.summary).replace(/^[：:]\s*/, '').trim()
    : '';

  let title = '';
  if (emoji) title += `${emoji} `;
  if (theme) title += theme;
  if (summary) title += `${theme ? '：' : ''}${summary}`;
  return title.trim();
}

/**
 * 全量替换已存在的标题行（旧 emoji/编号/正文丢弃，正文行不动）。
 * 组装结果为空（模型漏项或该级字段全空）→ 保留原标题行；原文 CRLF 会被保留。
 */
export function applyTitles(
  text: string,
  outline: HeadingNode[],
  titles: GeneratedTitle[],
  title: TitleSettings,
): TitleApplyResult {
  const usesCrlf = text.includes('\r\n');
  const lines = splitLines(text);
  let changedCount = 0;

  for (let i = 0; i < outline.length; i += 1) {
    const node = outline[i];
    if (!node) continue;

    const item = titles[i];
    if (!item) continue;

    const composed = composeTitle(title.levels[node.level], item);
    if (!composed) continue;

    const newLine = `${node.prefix}${composed}`;
    if (newLine === (lines[node.lineIndex] ?? '')) continue;

    lines[node.lineIndex] = newLine;
    changedCount += 1;
  }

  if (changedCount === 0) return { text, changedCount: 0 };

  let newText = lines.join('\n');
  if (usesCrlf) newText = newText.replace(/\n/g, '\r\n');
  return { text: newText, changedCount };
}


