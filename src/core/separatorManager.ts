import type { SeparatorTidyOptions } from '../types.ts';
import { ATX_HEADING_RE, scanHeadings, splitLines } from './documentScanner.ts';
import { classifyLines } from './markdownState.ts';
import type { MarkdownLineInfo } from './markdownState.ts';

export interface SeparatorManageResult {
  text: string;
  /** 删除的分割线数量 */
  removedCount: number;
  /** 插入的分割线数量 */
  insertedCount: number;
}

/** thematic break：独立成行的 - / * / _ × 3+（≤3 前导空格、任意尾随空格） */
const THEMATIC_BREAK_RE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;

export function getThematicBreakChar(line: string): '-' | '*' | '_' | null {
  const match = THEMATIC_BREAK_RE.exec(line);
  if (!match) return null;
  return (match[1] ?? '') as '-' | '*' | '_';
}

/**
 * setext 二级标题下划线：紧跟在非空文本行之后、中间没有空行。
 * 这类 `---` 不是分割线，删除时必须保留。
 */
function isSetextUnderline(lines: string[], contexts: MarkdownLineInfo[], index: number): boolean {
  if (index === 0) return false;

  const prevIndex = index - 1;
  const prev = lines[prevIndex] ?? '';
  if (contexts[prevIndex]?.kind !== 'text') return false;
  if (prev.trim() === '') return false;
  // 前一行本身是分割线或 ATX 标题时，当前 `---` 仍是普通分割线
  if (getThematicBreakChar(prev) !== null) return false;
  if (ATX_HEADING_RE.test(prev)) return false;

  return true;
}

/** 找出所有真正参与管理（可删/可判重）的分割线行号 */
export function findSeparatorLines(
  lines: string[],
  contexts: MarkdownLineInfo[] = classifyLines(lines),
): Set<number> {
  const separators = new Set<number>();

  for (let i = 0; i < lines.length; i += 1) {
    if (contexts[i]?.kind !== 'text') continue;

    const char = getThematicBreakChar(lines[i] ?? '');
    if (!char) continue;
    if (char === '-' && isSetextUnderline(lines, contexts, i)) continue;

    separators.add(i);
  }

  return separators;
}

/** 删除现有分割线，并把紧邻的多余空行收敛为一个空行 */
export function removeSeparators(text: string): SeparatorManageResult {
  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  const separators = findSeparatorLines(lines, contexts);
  if (separators.size === 0) return { text, removedCount: 0, insertedCount: 0 };

  const out: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!separators.has(i)) {
      out.push(lines[i] ?? '');
      continue;
    }

    // 跳过分割线；若前后都是空行，后续空行 run 全部跳过（保留 out 中已有的一个）
    const prevBlank = out.length > 0 && (out[out.length - 1] ?? '').trim() === '';
    let next = i + 1;
    while (
      next < lines.length &&
      !separators.has(next) &&
      (lines[next] ?? '').trim() === '' &&
      contexts[next]?.kind === 'text'
    ) {
      next += 1;
    }
    if (prevBlank && next > i + 1) i = next - 1;
  }

  return { text: out.join('\n'), removedCount: separators.size, insertedCount: 0 };
}

/** 向上找最近的非空行，判断目标标题前是否已经有分割线 */
function hasSeparatorBefore(lines: string[], separators: Set<number>, index: number): boolean {
  for (let i = index - 1; i >= 0; i -= 1) {
    if ((lines[i] ?? '').trim() === '') continue;
    return separators.has(i);
  }
  return false;
}

/**
 * 插入分割线（统一用 `---`，前后各留一个空行）。
 * - H1 之间：每个非首个 H1 之前；
 * - H2 之间：每个 H1 分组内、该组非首个 H2 之前；无 H1 时退化为全局非首个 H2；
 * - 目标位置已有分割线则不重复插入。
 */
export function insertSeparators(
  text: string,
  options: SeparatorTidyOptions,
): SeparatorManageResult {
  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  const separators = findSeparatorLines(lines, contexts);
  const insertAt = new Set<number>();

  let h1Count = 0;
  let h2InGroup = 0;

  for (const heading of scanHeadings(lines)) {
    if (heading.level === 1) {
      if (options.insertBetweenH1 && h1Count > 0) insertAt.add(heading.lineIndex);
      h1Count += 1;
      h2InGroup = 0;
      continue;
    }
    if (heading.level === 2) {
      if (options.insertBetweenH2 && h2InGroup > 0) insertAt.add(heading.lineIndex);
      h2InGroup += 1;
    }
  }

  if (insertAt.size === 0) return { text, removedCount: 0, insertedCount: 0 };

  const out: string[] = [];
  let insertedCount = 0;

  for (let i = 0; i < lines.length; i += 1) {
    if (insertAt.has(i) && !hasSeparatorBefore(lines, separators, i)) {
      // 把已有空行收成一个，保证「空行 + --- + 空行」的稳定结构
      while (out.length > 0 && (out[out.length - 1] ?? '').trim() === '') out.pop();
      if (out.length > 0) {
        out.push('', '---', '');
        insertedCount += 1;
      }
    }
    out.push(lines[i] ?? '');
  }

  if (insertedCount === 0) return { text, removedCount: 0, insertedCount: 0 };
  return { text: out.join('\n'), removedCount: 0, insertedCount };
}

/** 分割线管理总入口：先删旧，再插新 */
export function manageSeparators(
  text: string,
  options: SeparatorTidyOptions,
): SeparatorManageResult {
  let current = text;
  let removedCount = 0;
  let insertedCount = 0;

  if (options.removeExisting) {
    const removed = removeSeparators(current);
    current = removed.text;
    removedCount = removed.removedCount;
  }

  if (options.insertBetweenH1 || options.insertBetweenH2) {
    const inserted = insertSeparators(current, options);
    current = inserted.text;
    insertedCount = inserted.insertedCount;
  }

  return { text: current, removedCount, insertedCount };
}
