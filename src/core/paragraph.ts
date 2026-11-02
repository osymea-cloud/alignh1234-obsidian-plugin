import { classifyLines, splitLines } from './markdownState.ts';

/** 段落在文档中的行范围（0 起，闭区间） */
export interface ParagraphSpan {
  start: number;
  end: number;
}

/**
 * 找出包含游标行的「段落」。
 *
 * 段落 = 以空行 / frontmatter / 围栏代码块为界的连续非空行：
 * - 段落内允许出现标题、列表、表格等任意正文行（只有空行才截断）；
 * - 游标落在 frontmatter / 围栏行时按「单行」处理（该行就是整段）；
 * - 游标落在空行或超出文末时返回 null（空行本身没有「段」）。
 *
 * 纯函数：不依赖 Obsidian，便于单元测试。
 */
export function findParagraph(text: string, cursorLine: number): ParagraphSpan | null {
  const lines = splitLines(text);
  if (!Number.isInteger(cursorLine) || cursorLine < 0 || cursorLine >= lines.length) return null;

  const contexts = classifyLines(lines);
  if ((contexts[cursorLine]?.kind ?? 'text') !== 'text') {
    return { start: cursorLine, end: cursorLine };
  }

  const isBodyLine = (index: number): boolean =>
    index >= 0 &&
    index < lines.length &&
    (contexts[index]?.kind ?? 'text') === 'text' &&
    (lines[index] ?? '').trim() !== '';

  if (!isBodyLine(cursorLine)) return null;

  let start = cursorLine;
  while (isBodyLine(start - 1)) start -= 1;

  let end = cursorLine;
  while (isBodyLine(end + 1)) end += 1;

  return { start, end };
}
