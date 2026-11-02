import { classifyLines, splitLines } from './markdownState.ts';

export interface BlankLineCollapseResult {
  text: string;
  /** 被合并的空行段数量（一段连续空行记 1 次） */
  collapsedCount: number;
}

/**
 * 合并连续空行：连续 3+ 个换行（即 2+ 个连续空行）压成 1 个空行。
 *
 * - 跳过 YAML frontmatter 与围栏代码块（代码块内空行属于内容）；
 * - 文末保留至多 2 个换行（一个空行），避免多吞文件末尾换行；
 * - 无改动时原样返回，保留原始换行风格。
 */
export function collapseBlankLines(text: string): BlankLineCollapseResult {
  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  const out: string[] = [];
  let collapsedCount = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const kind = contexts[i]?.kind ?? 'text';

    // frontmatter / 围栏代码块内的空行是内容，原样保留
    if (kind === 'frontmatter' || kind === 'fence-content') {
      out.push(line);
      continue;
    }

    if (line.trim() !== '') {
      out.push(line);
      continue;
    }

    // 统计当前这段「普通区域内的连续空行」
    let end = i;
    while (end + 1 < lines.length) {
      const nextLine = lines[end + 1] ?? '';
      const nextKind = contexts[end + 1]?.kind ?? 'text';
      if (nextLine.trim() !== '' || nextKind === 'frontmatter' || nextKind === 'fence-content') {
        break;
      }
      end += 1;
    }

    const runLength = end - i + 1;
    const isAtEnd = end === lines.length - 1;
    const maxKeep = isAtEnd ? 2 : 1;
    const keep = Math.min(runLength, maxKeep);

    if (runLength > maxKeep) collapsedCount += 1;
    for (let k = 0; k < keep; k += 1) out.push('');

    i = end;
  }

  if (collapsedCount === 0) return { text, collapsedCount: 0 };
  return { text: out.join('\n'), collapsedCount };
}
