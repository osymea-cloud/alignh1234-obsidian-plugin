import { classifyLines, splitLines } from './markdownState.ts';

/** 图片嵌入的两种写法 */
export type ImageEmbedKind = 'wiki' | 'markdown';

/** 笔记里的一处图片嵌入 */
export interface ImageEmbed {
  /** 所在行号（0 起） */
  lineIndex: number;
  kind: ImageEmbedKind;
  /** 链接里书写的目标（已去掉 |别名 / #锚点 / "标题"） */
  target: string;
}

/** 视为图片的扩展名（小写、不含点） */
export const IMAGE_EXTENSIONS: readonly string[] = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'svg',
  'webp',
  'avif',
  'ico',
  'tif',
  'tiff',
];

const WIKI_EMBED_SOURCE = '!\\[\\[([^\\[\\]]+)\\]\\]';
const MARKDOWN_EMBED_SOURCE = '!\\[([^\\]]*)\\]\\(([^()]*)\\)';

/** 目标扩展名是否为图片 */
export function isImagePath(path: string): boolean {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return false;
  return IMAGE_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase());
}

/** 外链（http:、data:、obsidian:、`//cdn…` 等）不参与归档 */
export function isExternalTarget(target: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target);
}

/** `file#anchor` / `file#anchor|alias` → `file` */
function stripWikiSuffix(inner: string): string {
  const withoutAlias = inner.split('|')[0] ?? '';
  return (withoutAlias.split('#')[0] ?? '').trim();
}

/** markdown 目标：去尖括号、去 `"title"`、做 URL 解码 */
function stripMarkdownTarget(inner: string): string {
  let value = inner.trim();
  if (value.startsWith('<')) {
    const close = value.indexOf('>');
    if (close > 0) value = value.slice(1, close);
  } else {
    const titled = /^(.*?)\s+(?:"[^"]*"|'[^']*'|\([^()]*\))$/.exec(value);
    if (titled) value = titled[1] ?? value;
  }
  value = value.trim();
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** 拆出 wiki 链接的「目标 / 锚点 / 别名」，改写时只替换目标 */
function splitWikiInner(inner: string): { target: string; anchor: string; alias: string } {
  const pipeIndex = inner.indexOf('|');
  const alias = pipeIndex >= 0 ? inner.slice(pipeIndex) : '';
  const head = pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner;
  const hashIndex = head.indexOf('#');
  const anchor = hashIndex >= 0 ? head.slice(hashIndex) : '';
  const target = (hashIndex >= 0 ? head.slice(0, hashIndex) : head).trim();
  return { target, anchor, alias };
}

/**
 * 收集笔记中的图片嵌入（`![[…]]` 与 `![](…)`）。
 *
 * - 跳过 frontmatter 与围栏代码块（那里的 `![[…]]` 是示例文本，不是真嵌入）；
 * - 外链、空目标、`#heading` 之类的同页锚点不会出现在结果里；
 * - 只返回目标字符串，具体能不能解析成文件由调用方判断。
 */
export function collectImageEmbeds(text: string): ImageEmbed[] {
  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  const embeds: ImageEmbed[] = [];

  const wikiRe = new RegExp(WIKI_EMBED_SOURCE, 'g');
  const markdownRe = new RegExp(MARKDOWN_EMBED_SOURCE, 'g');

  for (let i = 0; i < lines.length; i += 1) {
    if ((contexts[i]?.kind ?? 'text') !== 'text') continue;
    const line = lines[i] ?? '';

    for (const match of line.matchAll(wikiRe)) {
      const target = stripWikiSuffix(match[1] ?? '');
      if (target.length === 0 || isExternalTarget(target)) continue;
      embeds.push({ lineIndex: i, kind: 'wiki', target });
    }

    for (const match of line.matchAll(markdownRe)) {
      const target = stripMarkdownTarget(match[2] ?? '');
      if (target.length === 0 || target.startsWith('#') || isExternalTarget(target)) continue;
      embeds.push({ lineIndex: i, kind: 'markdown', target });
    }
  }

  return embeds;
}

/**
 * 把链接里的旧目标替换为新目标（`![[旧]]` → `![[新]]`、`![alt](旧)` → `![alt](新)`）。
 *
 * - `rename` 的键是 `collectImageEmbeds` 返回的 `target`；
 * - wiki 链接保留 `#锚点` / `|别名`，markdown 链接保留 alt 文本（标题会丢弃）；
 * - 无命中时原样返回原文本，保留换行风格。
 */
export function rewriteImageEmbeds(text: string, rename: ReadonlyMap<string, string>): string {
  if (rename.size === 0) return text;

  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  let changed = false;

  const wikiRe = new RegExp(WIKI_EMBED_SOURCE, 'g');
  const markdownRe = new RegExp(MARKDOWN_EMBED_SOURCE, 'g');

  const out = lines.map((line, i) => {
    if ((contexts[i]?.kind ?? 'text') !== 'text') return line;

    let next = line.replace(wikiRe, (whole: string, inner: string) => {
      const { target, anchor, alias } = splitWikiInner(inner);
      const replacement = rename.get(target);
      if (replacement === undefined) return whole;
      changed = true;
      return `![[${replacement}${anchor}${alias}]]`;
    });

    next = next.replace(markdownRe, (whole: string, alt: string, inner: string) => {
      const target = stripMarkdownTarget(inner);
      const replacement = rename.get(target);
      if (replacement === undefined) return whole;
      changed = true;
      return `![${alt}](${replacement})`;
    });

    return next;
  });

  return changed ? out.join('\n') : text;
}
