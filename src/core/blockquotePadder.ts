import { classifyLines, splitLines } from './markdownState.ts';

export interface BlockquotePadResult {
  /** 补齐后的完整文本 */
  text: string;
  /** 新插入的空 > 行数（首尾各算 1 行） */
  paddedCount: number;
}

/** 块引用行：行首允许缩进，随后是 `>` */
const QUOTE_LINE_RE = /^\s*>/;
/** 「空块引用行」：只由 `>` 与空白组成（`>`、`> `、`> >`、`>>` 都算） */
const EMPTY_QUOTE_RE = /^\s*(?:>\s*)+$/;

/** 取行首缩进，插入的空行沿用同一缩进，保持块引用的层级与格式 */
function leadingWhitespace(line: string): string {
  return /^\s*/.exec(line)?.[0] ?? '';
}

/**
 * 为每个块引用段的首尾各补一行空 `>`。
 *
 * - 连续的 `>` 行视为一段；段内已有的空 `>` 行不会被重复添加（幂等）；
 * - 首行插入的空行沿用段首缩进，尾行沿用段尾缩进；
 * - 跳过 YAML frontmatter 与围栏代码块（那里的 `>` 是内容）；
 * - 无改动时原样返回，保留原始换行风格。
 */
export function padBlockquotes(text: string): BlockquotePadResult {
  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  const out: string[] = [];
  let paddedCount = 0;

  const isQuoteLine = (index: number): boolean =>
    index >= 0 &&
    index < lines.length &&
    (contexts[index]?.kind ?? 'text') === 'text' &&
    QUOTE_LINE_RE.test(lines[index] ?? '');

  for (let i = 0; i < lines.length; i += 1) {
    if (!isQuoteLine(i)) {
      out.push(lines[i] ?? '');
      continue;
    }

    // 找到这一段连续块引用的末尾
    let end = i;
    while (isQuoteLine(end + 1)) end += 1;

    const first = lines[i] ?? '';
    const last = lines[end] ?? '';

    if (EMPTY_QUOTE_RE.test(first)) {
      out.push(first);
    } else {
      out.push(`${leadingWhitespace(first)}>`);
      out.push(first);
      paddedCount += 1;
    }

    for (let k = i + 1; k <= end; k += 1) out.push(lines[k] ?? '');

    if (!EMPTY_QUOTE_RE.test(last)) {
      out.push(`${leadingWhitespace(last)}>`);
      paddedCount += 1;
    }

    i = end;
  }

  if (paddedCount === 0) return { text, paddedCount: 0 };
  return { text: out.join('\n'), paddedCount };
}
