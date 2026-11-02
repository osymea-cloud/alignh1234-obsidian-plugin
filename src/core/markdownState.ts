/**
 * 共享的 Markdown 结构状态机：frontmatter + 围栏代码块。
 *
 * 编号扫描、空行合并、分割线管理、代码块语言补全四处共用，
 * 避免各自实现一套略有差异的围栏判定。
 */

/** 围栏代码块信息 */
export interface FenceInfo {
  /** 围栏字符：` 或 ~ */
  char: '`' | '~';
  /** 围栏长度（反引号/波浪线个数，≥3） */
  length: number;
  /** 开围栏行上的语言信息（已 trim，无语言时为空串） */
  info: string;
}

export type MarkdownLineKind =
  | 'frontmatter'
  | 'fence-open'
  | 'fence-content'
  | 'fence-close'
  | 'text';

export interface MarkdownLineInfo {
  kind: MarkdownLineKind;
  /** 仅 fence-open / fence-close 携带 */
  fence?: FenceInfo;
}

/** 开围栏：最多 3 个前导空格 + 3 个以上 ` 或 ~ + 其余内容 */
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
/** 闭围栏：同字符且长度不小于开围栏，只允许尾随空白 */
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

/** 按 \n 切行，并去掉 Windows 换行残留的 \r */
export function splitLines(text: string): string[] {
  return text.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
}

function parseFenceOpen(line: string): FenceInfo | null {
  const match = FENCE_OPEN_RE.exec(line);
  if (!match) return null;

  const marker = match[1] ?? '';
  const rest = match[2] ?? '';
  const char = marker.charAt(0);
  // CommonMark：反引号围栏的 info string 里不能再出现反引号
  if (char === '`' && rest.includes('`')) return null;

  return {
    char: char as '`' | '~',
    length: marker.length,
    info: rest.trim(),
  };
}

function isFenceClose(line: string, fence: FenceInfo): boolean {
  const match = FENCE_CLOSE_RE.exec(line);
  if (!match) return false;
  const marker = match[1] ?? '';
  return marker.charAt(0) === fence.char && marker.length >= fence.length;
}

/** 文件开头必须有闭合分隔符才按 frontmatter 处理，避免把普通分割线吞掉 */
function hasClosingFrontmatter(lines: string[]): boolean {
  const first = (lines[0] ?? '').replace(/^\uFEFF/, '').trim();
  if (first !== '---') return false;

  for (let i = 1; i < lines.length; i += 1) {
    const trimmed = (lines[i] ?? '').trim();
    if (trimmed === '---' || trimmed === '...') return true;
  }
  return false;
}

/**
 * 给每一行标注所属区域。
 * frontmatter 的首尾分隔符与内容行都标记为 frontmatter；
 * 围栏代码块区分开围栏、内容、闭围栏。
 */
export function classifyLines(lines: string[]): MarkdownLineInfo[] {
  const result: MarkdownLineInfo[] = [];
  const hasFrontmatter = hasClosingFrontmatter(lines);
  let inFrontmatter = false;
  let frontmatterDone = !hasFrontmatter;
  let fence: FenceInfo | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';

    if (!frontmatterDone) {
      if (i === 0) {
        inFrontmatter = true;
        result.push({ kind: 'frontmatter' });
        continue;
      }
      if (inFrontmatter) {
        result.push({ kind: 'frontmatter' });
        const trimmed = line.trim();
        if (trimmed === '---' || trimmed === '...') {
          inFrontmatter = false;
          frontmatterDone = true;
        }
        continue;
      }
    }

    if (fence) {
      if (isFenceClose(line, fence)) {
        result.push({ kind: 'fence-close', fence });
        fence = null;
      } else {
        result.push({ kind: 'fence-content' });
      }
      continue;
    }

    const opened = parseFenceOpen(line);
    if (opened) {
      fence = opened;
      result.push({ kind: 'fence-open', fence: opened });
      continue;
    }

    result.push({ kind: 'text' });
  }

  return result;
}
