import type {
  HeadingLevel,
  H1RenumberSettings,
  LevelConfig,
  LineEdit,
  ParsedHeading,
  RenumberResult,
  ScannedHeading,
} from '../types.ts';
import { HEADING_LEVELS } from '../types.ts';
import { scanHeadings, splitLines } from './documentScanner.ts';
import { hasNumber, parseHeading } from './headingParser.ts';
import { formatNumberToken } from './numberFormatter.ts';
import { getAllNumberSystems } from './numberSystems/index.ts';
import { getDelimiter, getRecognitionDelimiters } from './delimiters.ts';
import type { Delimiter } from './delimiters.ts';

interface ParsedHeadingItem {
  heading: ScannedHeading;
  parsed: ParsedHeading;
}

interface LevelPlan {
  edits: LineEdit[];
  headingCount: number;
}

/**
 * 某一层级用于识别的分隔符集合。
 *
 * 默认只使用 13 种字符分隔符；若该层级配置为「空格」/「无分隔符」，
 * 则额外把该生成分隔符纳入本层级的识别，保证重复执行不会叠加编号（幂等）。
 */
function getParseDelimiters(config: LevelConfig): readonly Delimiter[] {
  const base = getRecognitionDelimiters();
  if (config.delimiterId !== 'space' && config.delimiterId !== 'none') return base;
  const extra = getDelimiter(config.delimiterId);
  return extra ? [...base, extra] : base;
}

/**
 * 按「更浅的标题」切组，只保留目标级别的标题。
 * 任何 level < targetLevel 的标题都会切组/重置计数；更深的标题不打断当前组。
 */
function groupHeadings(headings: ScannedHeading[], targetLevel: HeadingLevel): ScannedHeading[][] {
  const groups: ScannedHeading[][] = [];
  let current: ScannedHeading[] = [];

  for (const heading of headings) {
    if (heading.level < targetLevel) {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      continue;
    }
    if (heading.level !== targetLevel) continue;
    current.push(heading);
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

/**
 * 按设置决定是否在编号 token 后补一个空格。
 *
 * - `spaceAfter = false`：原样返回；
 * - token 为空（style = none 清除编号）：不补，避免留下悬空空格；
 * - token 已以空白结尾（「空格」分隔符）：不补，避免叠加。
 */
function withSpaceAfter(token: string, spaceAfter: boolean): string {
  if (!spaceAfter || token.length === 0 || /\s$/.test(token)) return token;
  return `${token} `;
}

/** 计算单个层级的标题改动（只依赖标题结构，不依赖其它层级的编号结果） */
function planLevel(
  headings: ScannedHeading[],
  lines: string[],
  targetLevel: HeadingLevel,
  config: LevelConfig,
  spaceAfter: boolean,
): LevelPlan {
  const groups = groupHeadings(headings, targetLevel);
  const systems = getAllNumberSystems();
  const delimiters = getParseDelimiters(config);
  const edits: LineEdit[] = [];
  let headingCount = 0;

  const emit = (heading: ScannedHeading, newTitle: string): void => {
    const newLine = heading.prefix + newTitle;
    if (newLine !== (lines[heading.lineIndex] ?? '')) {
      edits.push({ lineIndex: heading.lineIndex, newText: newLine });
    }
  };

  for (const group of groups) {
    headingCount += group.length;
    if (group.length === 0) continue;

    const parsedGroup: ParsedHeadingItem[] = group.map((heading) => ({
      heading,
      parsed: parseHeading(heading.titleText, systems, delimiters),
    }));

    const allNumbered = parsedGroup.every((item) => hasNumber(item.parsed));

    if (config.fillPolicy === 'always' || (config.fillPolicy === 'consistent' && allNumbered)) {
      // 补号 + 重排：组内从 1 开始
      parsedGroup.forEach((item, index) => {
        const token = withSpaceAfter(formatNumberToken(index + 1, config), spaceAfter);
        emit(item.heading, item.parsed.emojiPrefix + token + item.parsed.content);
      });
      continue;
    }

    if (config.fillPolicy === 'consistent') {
      // 组内出现无编号 → 整组清空已有编号（单级 / 多级 token 都算「已有编号」）
      for (const item of parsedGroup) {
        if (!hasNumber(item.parsed)) continue;
        emit(item.heading, item.parsed.emojiPrefix + item.parsed.content);
      }
      continue;
    }

    // 'never'：只重排已有编号，无编号跳过
    let counter = 0;
    for (const item of parsedGroup) {
      if (!hasNumber(item.parsed)) continue;
      counter += 1;
      const token = withSpaceAfter(formatNumberToken(counter, config), spaceAfter);
      emit(item.heading, item.parsed.emojiPrefix + token + item.parsed.content);
    }
  }

  return { edits, headingCount };
}

function applyLineEditsToText(text: string, lines: string[], edits: LineEdit[]): string {
  if (edits.length === 0) return text;

  const newLines = lines.slice();
  for (const edit of edits) {
    newLines[edit.lineIndex] = edit.newText;
  }
  return newLines.join('\n');
}

/**
 * 按目标标题级别重新编号（单级模式；多级模式下忽略 `targetLevel`，整体重排）。
 *
 * 补号策略（LevelConfig.fillPolicy）：
 * - always：整组按 1..n 补号并重排，无编号也补；
 * - consistent：整组都有编号则按 1..n 重排，存在任一无编号则整组清空编号；
 * - never：无编号跳过，只重排已有编号。
 *
 * 纯函数：不依赖 Obsidian，可直接用 node --test 覆盖。
 */
export function renumberText(
  text: string,
  settings: H1RenumberSettings,
  targetLevel: HeadingLevel = 1,
): RenumberResult {
  if (settings.numberingMode === 'multi') return renumberMultiLevel(text);

  const lines = splitLines(text);
  const headings = scanHeadings(lines);
  const plan = planLevel(
    headings,
    lines,
    targetLevel,
    settings.levels[targetLevel],
    settings.spaceAfterDelimiter,
  );

  return {
    edits: plan.edits,
    newText: applyLineEditsToText(text, lines, plan.edits),
    headingCount: plan.headingCount,
    changedCount: plan.edits.length,
  };
}

/**
 * 多级编号（全补号）：H1=`1 `、H2=`1.1 `、H3=`1.1.1 `、H4=`1.1.1.1 `。
 *
 * - 固定阿拉伯数字 + `.` + 末尾一个空格，忽略每级的 style / delimiterId / fillPolicy；
 * - 每个标题都补全路径编号（无编号也补）；
 * - 缺父级按 1 兜底：路径长度恒等于标题层级；
 * - 旧编号（单级 `一、` 或多级 `1.1 `）都会被剥掉，因此单级 ↔ 多级切换后重复执行幂等。
 */
export function renumberMultiLevel(text: string): RenumberResult {
  const lines = splitLines(text);
  const headings = scanHeadings(lines);
  const systems = getAllNumberSystems();
  const delimiters = getRecognitionDelimiters();
  const counters: Record<HeadingLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const edits: LineEdit[] = [];

  for (const heading of headings) {
    const level = heading.level;
    counters[level] += 1;
    for (const deeper of HEADING_LEVELS) {
      if (deeper > level) counters[deeper] = 0;
    }

    // 路径长度恒等于层级；被重置为 0 的父级按 1 兜底
    const path: number[] = [];
    for (const ancestor of HEADING_LEVELS) {
      if (ancestor > level) break;
      const counter = counters[ancestor];
      path.push(counter === 0 ? 1 : counter);
    }

    const parsed = parseHeading(heading.titleText, systems, delimiters, 'multi');
    const newLine = `${heading.prefix}${parsed.emojiPrefix}${path.join('.')} ${parsed.content}`;
    if (newLine !== (lines[heading.lineIndex] ?? '')) {
      edits.push({ lineIndex: heading.lineIndex, newText: newLine });
    }
  }

  return {
    edits,
    newText: applyLineEditsToText(text, lines, edits),
    headingCount: headings.length,
    changedCount: edits.length,
  };
}

/**
 * 一次处理 H1-H4，按 `settings.numberingMode` 分流：
 * - single：每级独立编号（默认全级 always，逐级可配）；
 * - multi：多级编号（固定格式、全补号）。
 *
 * 单级模式下四层编辑只依赖标题结构、不依赖彼此编号，因此可以基于同一份扫描结果分别计算，
 * 最后合并为一份行改动，交给调用方一次性写回。
 */
export function renumberAll(text: string, settings: H1RenumberSettings): RenumberResult {
  if (settings.numberingMode === 'multi') return renumberMultiLevel(text);

  const lines = splitLines(text);
  const headings = scanHeadings(lines);
  const merged = new Map<number, string>();
  let headingCount = 0;

  for (const level of HEADING_LEVELS) {
    const plan = planLevel(
      headings,
      lines,
      level,
      settings.levels[level],
      settings.spaceAfterDelimiter,
    );
    headingCount += plan.headingCount;
    for (const edit of plan.edits) merged.set(edit.lineIndex, edit.newText);
  }

  const edits: LineEdit[] = Array.from(merged.entries())
    .map(([lineIndex, newText]) => ({ lineIndex, newText }))
    .sort((a, b) => a.lineIndex - b.lineIndex);

  return {
    edits,
    newText: applyLineEditsToText(text, lines, edits),
    headingCount,
    changedCount: edits.length,
  };
}