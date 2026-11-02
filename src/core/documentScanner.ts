import type { HeadingLevel, ScannedHeading } from '../types.ts';
import { classifyLines } from './markdownState.ts';

export { splitLines } from './markdownState.ts';

/** ATX 标题：最多 3 个缩进 + 1-6 个 # + 空白 + 文本（只处理 H1-H4） */
export const ATX_HEADING_RE = /^(\s{0,3})(#{1,6})([ \t]+)(.*)$/;

/**
 * 扫描文档中的 H1-H4 标题，跳过 YAML frontmatter 与围栏代码块内部。
 * H5/H6 不参与重编号（直接忽略）。
 */
export function scanHeadings(lines: string[]): ScannedHeading[] {
  const headings: ScannedHeading[] = [];
  const contexts = classifyLines(lines);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (contexts[lineIndex]?.kind !== 'text') continue;

    const line = lines[lineIndex] ?? '';
    const headingMatch = ATX_HEADING_RE.exec(line);
    if (!headingMatch) continue;

    const hashes = headingMatch[2] ?? '';
    const level = hashes.length;
    if (level < 1 || level > 4) continue;

    headings.push({
      lineIndex,
      level: level as HeadingLevel,
      prefix: (headingMatch[1] ?? '') + hashes + (headingMatch[3] ?? ''),
      titleText: headingMatch[4] ?? '',
    });
  }

  return headings;
}
