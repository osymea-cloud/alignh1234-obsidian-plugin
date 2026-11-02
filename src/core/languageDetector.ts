import { classifyLines, splitLines } from './markdownState.ts';

/**
 * 代码块语言识别注册表。
 *
 * 规则式、有序、保守：按特异性从强到弱尝试，命中就补标签；
 * 识别不了就返回 null（宁缺毋滥），绝不猜测。
 */
export interface LanguageDetector {
  /** 补进代码块的语言标签（统一小写） */
  id: string;
  /** 主识别：阈值较高，单独出现即可判定 */
  detect(code: string): boolean;
  /**
   * 弱识别：阈值低于主识别，仅用于「前一个代码块已明确是该语言」且本块为
   * 单条/几条调用或赋值语句时的复用判断；未提供则不支持复用。
   */
  weakDetect?(code: string): boolean;
}

export interface CodeBlockLanguageResult {
  text: string;
  /** 补上语言的代码块数量 */
  addedCount: number;
}

function looksLikeJson(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed || !(trimmed.startsWith('{') || trimmed.startsWith('['))) return false;
  try {
    const value: unknown = JSON.parse(trimmed);
    return value !== null && typeof value === 'object';
  } catch {
    return false;
  }
}

/** 只用于排除 YAML：出现明显的 Python 写法时不要把「key: value」误判成 YAML */
function hasPythonSignal(code: string): boolean {
  return /(^|\n)\s*(def\s+\w+\s*\(|class\s+\w+.*:|from\s+[\w.]+\s+import\s+|import\s+[\w.]+|@[\w.]+|print\s*\()/.test(
    code,
  );
}

function looksLikeYaml(code: string): boolean {
  if (hasPythonSignal(code)) return false;

  const rawLines = code.split('\n').filter((line) => line.trim() !== '');
  if (rawLines.length === 0) return false;

  let keyCount = 0;
  let structuralCount = 0;

  for (const raw of rawLines) {
    const line = raw.trim();
    if (line === '---' || line === '...' || line.startsWith('#')) {
      structuralCount += 1;
      continue;
    }
    if (/^-\s+/.test(line) || line === '-') {
      structuralCount += 1;
      continue;
    }
    if (/^[A-Za-z_][\w.-]*\s*:(\s+|$)/.test(line)) {
      keyCount += 1;
      structuralCount += 1;
      continue;
    }
    // 缩进续行 / 块标量
    if (/^\s{2,}\S/.test(raw)) {
      structuralCount += 1;
      continue;
    }
    return false;
  }

  return keyCount >= 2 || (keyCount >= 1 && structuralCount >= 2 && rawLines.length >= 2);
}

function looksLikePython(code: string): boolean {
  let score = 0;

  for (const raw of code.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (/^#!.*\bpython[0-9.]*\b/i.test(line)) return true;
    if (/^(def|class)\s+[A-Za-z_]\w*.*:\s*$/.test(line)) score += 3;
    else if (/^from\s+[\w.]+\s+import\s+/.test(line) || /^import\s+[\w.]+/.test(line)) score += 2;
    else if (/^(if|elif|else|for|while|try|except|finally|with)\b.*:\s*$/.test(line)) score += 2;
    else if (/^(print|len|range|str|int|open)\s*\(/.test(line)) score += 2;
    else if (/^@[\w.]+/.test(line)) score += 1;
    else if (/^(return|yield|raise|pass|break|continue)\b/.test(line)) score += 1;
    else if (/\b(self\.|None|True|False|__name__)\b/.test(line)) score += 1;
  }

  return score >= 2;
}

function looksLikeBash(code: string): boolean {
  let score = 0;

  for (const raw of code.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (/^#!.*\b(ba|z|k|da)?sh\b/.test(line)) return true;
    if (/^\$\s+\S/.test(line)) score += 2;
    else if (/^echo\s+/.test(line)) score += 2;
    else if (/^export\s+[A-Za-z_]\w*=/.test(line)) score += 2;
    else if (/^(if|for|while|case)\b.*(;|\bthen\b|\bdo\b|\bin\b)/.test(line)) score += 1;
    else if (/^(fi|done|esac)$/.test(line)) score += 1;
    else if (
      /^(sudo|apt|apt-get|brew|chmod|chown|mkdir|rm|cp|mv|cat|grep|sed|awk|curl|wget)\b/.test(line)
    ) {
      score += 1;
    } else if (/\$\{?[A-Za-z_]\w*\}?/.test(line)) {
      score += 1;
    } else if (/^set\s+-[eux]/.test(line)) {
      score += 1;
    }
  }

  return score >= 2;
}

const SQL_RE =
  /^\s*(select\b[\s\S]*\bfrom\b|with\s+[A-Za-z_]\w*\s+as\s*\(|insert\s+into\b|update\s+[A-Za-z_]\w*\s+set\b|delete\s+from\b|create\s+(table|index|view|database)\b|alter\s+table\b|drop\s+(table|index|view|database)\b)/i;

function looksLikeSql(code: string): boolean {
  return SQL_RE.test(code);
}

function looksLikeHtml(code: string): boolean {
  if (/<!doctype\s+html/i.test(code)) return true;
  if (/<html[\s>]/i.test(code)) return true;
  if (
    /<(head|body|div|span|p|a|ul|ol|li|table|tr|td|form|input|button|script|style|meta|link|h[1-6])[\s>]/i.test(
      code,
    )
  ) {
    return true;
  }
  return /<\/[a-z][\w-]*>/i.test(code);
}

function looksLikeCpp(code: string): boolean {
  if (
    /#include\s*<(iostream|vector|string|map|set|algorithm|memory|utility|unordered_map|unordered_set|fstream|sstream|cstdio|cstdlib|cmath)>/.test(
      code,
    )
  ) {
    return true;
  }
  if (/\bstd::/.test(code)) return true;
  if (/\b(cout|cin|cerr)\s*<</.test(code)) return true;
  if (/\btemplate\s*</.test(code)) return true;
  if (/\bnamespace\s+[A-Za-z_]\w*\s*\{/.test(code)) return true;
  return /\b(public|private|protected)\s*:/.test(code);
}

function looksLikeC(code: string): boolean {
  if (
    /#include\s*<(stdio|stdlib|string|math|ctype|time|stdint|stdbool|assert|errno)\.h>/.test(code)
  ) {
    return true;
  }
  if (/\b(printf|scanf|malloc|calloc|realloc|free|strcpy|strlen|memcpy|fopen|fclose)\s*\(/.test(code)) {
    return true;
  }
  if (/\b(int|void|char|float|double|long|short|unsigned)\s+main\s*\(/.test(code)) return true;
  return /\bstruct\s+[A-Za-z_]\w*\s*\{/.test(code);
}

/** ---- 弱识别：只在前一个代码块已确定语言时启用，阈值低于主识别 ---- */

function looksWeakJson(code: string): boolean {
  const trimmed = code.trim();
  if (trimmed === '') return false;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return false;
  return /"[\w$@.-]+"\s*:/.test(trimmed);
}

function looksWeakYaml(code: string): boolean {
  if (hasPythonSignal(code)) return false;
  for (const raw of code.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^[A-Za-z_][\w.-]*\s*:(\s+|$)/.test(line)) return true;
  }
  return false;
}

function looksWeakPython(code: string): boolean {
  for (const raw of code.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#!.*\bpython[0-9.]*\b/i.test(line)) return true;
    if (/^(def|class)\s+[A-Za-z_]\w*.*:\s*$/.test(line)) return true;
    if (/^(from\s+[\w.]+\s+import\s+|import\s+[\w.]+)/.test(line)) return true;
    if (/^(if|elif|else|for|while|try|except|finally|with)\b.*:\s*$/.test(line)) return true;
    if (/^(print|len|range|str|int|open)\s*\(/.test(line)) return true;
    if (/\b(self\.|None|True|False)\b/.test(line)) return true;
    // v0.0.8：门槛更低的语句级弱信号（仅在「前一块强识别为 python」时启用）。
    // 覆盖 `buf = StringIO()` 这类构造调用，以及 `buf.write(...)` / `result = buf.getvalue()`。
    if (/(?:^|[=(,[]\s*)[A-Z][A-Za-z0-9_]*\s*\(/.test(line)) return true;
    if (
      /(?:^|[=(,[]\s*)[A-Za-z_]\w*\.(?:write|writelines|getvalue|read|readline|readlines|seek|close|flush|append|extend|insert|remove|pop|keys|values|items|get|update|split|rsplit|strip|lstrip|rstrip|replace|startswith|endswith|format|encode|decode|join|lower|upper)\s*\(/.test(
        line,
      )
    ) {
      return true;
    }
    if (/\b(?:os|sys|json|re|math|time|datetime|pathlib|np|pd|plt|io)\.\w+\s*\(/.test(line)) {
      return true;
    }
  }
  return false;
}

function looksWeakBash(code: string): boolean {
  for (const raw of code.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#!.*\b(ba|z|k|da)?sh\b/.test(line)) return true;
    if (/^\$\s+\S/.test(line)) return true;
    if (/^echo\s+/.test(line)) return true;
    if (/^export\s+[A-Za-z_]\w*=/.test(line)) return true;
    if (
      /^(sudo|apt|apt-get|brew|chmod|chown|mkdir|rm|cp|mv|cat|grep|sed|awk|curl|wget)\b/.test(line)
    ) {
      return true;
    }
    if (/^(if|for|while|case)\b.*(;|\bthen\b|\bdo\b|\bin\b)/.test(line)) return true;
    if (/^(fi|done|esac)$/.test(line)) return true;
  }
  return false;
}

function looksWeakSql(code: string): boolean {
  const hasKeyword =
    /\b(select|from|where|join|insert|update|delete|create|alter|drop|table|values|set|into|order|group|limit|offset|having)\b/i.test(
      code,
    );
  const hasSyntax = /[=*();,'"]|\b\w+\s*\.\s*\w+\b/.test(code);
  return hasKeyword && hasSyntax;
}

function looksWeakHtml(code: string): boolean {
  return /<\/?[a-z][\w-]*(\s[^>]*)?>/i.test(code);
}

function looksWeakCpp(code: string): boolean {
  return (
    /#include\s*</.test(code) ||
    /\bstd::/.test(code) ||
    /\b(cout|cin|cerr)\b/.test(code) ||
    /\btemplate\s*</.test(code)
  );
}

function looksWeakC(code: string): boolean {
  return (
    /#include\s*<\w+\.h>/.test(code) ||
    /\b(printf|scanf|malloc|calloc|realloc|free|strcpy|strlen|memcpy)\s*\(/.test(code) ||
    /\b(int|void|char|float|double|long|short|unsigned)\s+[A-Za-z_]\w*\s*\(/.test(code)
  );
}

/** ---- 语句级弱识别门槛（决策 #48）：只对「单独一条/几条调用或赋值语句」启用弱识别 ---- */

/** 一个块最多包含几条语句才允许弱识别 */
export const MAX_WEAK_STATEMENT_LINES = 5;

/** 完整程序特征（定义/导入/标记语言等）→ 不做弱识别 */
const FULL_PROGRAM_RE =
  /(^|\n)\s*(?:def\s+[A-Za-z_]|class\s+[A-Za-z_]|function\s|import\s|from\s+[\w.]+\s+import\s|#include\b|package\s|namespace\s|public\s|private\s|protected\s|@[A-Za-z_]|<\?|<!doctype\b|<html\b|<\/?[a-z][\w-]*\b)/i;

const STATEMENT_RE =
  /^(?:(?:let|const|var|final|val|my|local|auto|static|int|char|float|double|long|short|unsigned|signed|void|bool|size_t|string)\s+)?(?:[A-Za-z_$][\w$]*::)*[A-Za-z_$][\w$]*(?:(?:\s*(?:\.|->|::)\s*)[A-Za-z_$][\w$]*(?:\s*\([^)]*\))?|\[[^\]]*\])*\s*(?:=(?!=)|:=|\+=|-=|\*=|\/=|%=|<<=|>>=|&=|\|=|\^=|<-|<<|>>)\s*\S.*$/;

const CALL_RE =
  /^(?:await\s+)?(?:[A-Za-z_$][\w$]*::)*[A-Za-z_$][\w$]*(?:(?:\s*(?:\.|->|::)\s*)[A-Za-z_$][\w$]*)*\s*\([^)]*\)\s*;?$/;

const SQL_STATEMENT_RE =
  /^(?:select|from|where|order\s+by|group\s+by|having|limit|offset|insert|update|delete|join|left|right|inner|outer|values|set|create|alter|drop|with|union)\b/i;

const SHELL_COMMAND_RE =
  /^(?:\$|echo|export|cd|ls|cat|grep|sed|awk|curl|wget|sudo|apt|apt-get|brew|chmod|chown|mkdir|rm|cp|mv|git|npm|npx|pnpm|yarn|pip|python3?|node|docker|kubectl|systemctl|make|source)\b/;

function isStatementLine(line: string): boolean {
  if (SQL_STATEMENT_RE.test(line)) return true;
  if (SHELL_COMMAND_RE.test(line)) return true;
  if (STATEMENT_RE.test(line)) return true;
  if (CALL_RE.test(line)) return true;
  return /^[A-Za-z_$][\w$]*(?:(?:\s*(?:\.|->|::)\s*)[A-Za-z_$][\w$]*)*\s*;$/.test(line);
}

/**
 * 是否只包含「单独一条/几条调用或赋值语句」。
 * 保守判定：含 def/class/import/标记语言等完整程序特征、含花括号块、超过 5 行都返回 false。
 * 空块与纯注释块也不做弱识别。
 */
export function isStatementBlock(code: string): boolean {
  const lines = code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  if (lines.length === 0 || lines.length > MAX_WEAK_STATEMENT_LINES) return false;
  if (FULL_PROGRAM_RE.test(code)) return false;

  let statements = 0;
  for (const line of lines) {
    if (/^(?:\/\/|#|--)/.test(line)) continue;
    if (/[{}]/.test(line)) return false;
    statements += 1;
    if (!isStatementLine(line)) return false;
  }
  return statements > 0;
}

/** 按特异性从强到弱排列 */
const DETECTORS: LanguageDetector[] = [
  { id: 'json', detect: looksLikeJson, weakDetect: looksWeakJson },
  { id: 'yaml', detect: looksLikeYaml, weakDetect: looksWeakYaml },
  { id: 'python', detect: looksLikePython, weakDetect: looksWeakPython },
  { id: 'bash', detect: looksLikeBash, weakDetect: looksWeakBash },
  { id: 'sql', detect: looksLikeSql, weakDetect: looksWeakSql },
  { id: 'html', detect: looksLikeHtml, weakDetect: looksWeakHtml },
  { id: 'cpp', detect: looksLikeCpp, weakDetect: looksWeakCpp },
  { id: 'c', detect: looksLikeC, weakDetect: looksWeakC },
];

export function getLanguageDetectors(): LanguageDetector[] {
  return DETECTORS.slice();
}

/** 识别代码内容对应的语言标签；无法可靠识别返回 null */
export function detectLanguage(code: string): string | null {
  if (code.trim() === '') return null;
  for (const detector of DETECTORS) {
    if (detector.detect(code)) return detector.id;
  }
  return null;
}

/** 取围栏 info 的第一个 token 作为语言标签（如 `python title="x"` → `python`） */
function fenceLanguage(info: string): string {
  return (info.trim().split(/\s+/)[0] ?? '').toLowerCase();
}

/** 按 id 查注册表内的识别器（用于复用前一块语言） */
export function getLanguageDetector(id: string | null): LanguageDetector | null {
  if (!id) return null;
  return DETECTORS.find((detector) => detector.id === id) ?? null;
}

/**
 * 给缺少语言的围栏代码块补上语言标签。
 * - 仅处理围栏（``` / ~~~，含 4+ 反引号），缩进代码块与 frontmatter 不碰；
 * - 已有语言的代码块保持原样，并更新强参照；
 * - 先做主识别；识别不了且是「单条/几条调用或赋值语句」时，
 *   对照「前一个强识别成功/显式标注的代码块」做弱识别，命中才复用，否则留空；
 * - 弱识别成功不更新强参照（决策 #49）。
 */
export function addCodeBlockLanguages(text: string): CodeBlockLanguageResult {
  const lines = splitLines(text);
  const contexts = classifyLines(lines);
  const out = lines.slice();
  let addedCount = 0;
  /** 最近一个「强识别成功或显式标注」的代码块标签（可能不在注册表内，如 javascript） */
  let prevStrongLang: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const info = contexts[i];
    if (info?.kind !== 'fence-open' || !info.fence) continue;

    if (info.fence.info !== '') {
      // 已有标注：更新强参照，标签本身不动
      prevStrongLang = fenceLanguage(info.fence.info);
      continue;
    }

    let end = i + 1;
    while (end < lines.length && contexts[end]?.kind === 'fence-content') end += 1;

    const code = lines.slice(i + 1, end).join('\n');
    const strong = detectLanguage(code);
    let language = strong;
    if (!language && isStatementBlock(code)) {
      const previous = getLanguageDetector(prevStrongLang);
      if (previous?.weakDetect?.(code)) language = previous.id;
    }
    // 识别不了：留空；弱识别成功也不更新参照（决策 #49）
    if (!language) continue;

    const match = /^ {0,3}(`{3,}|~{3,})/.exec(lines[i] ?? '');
    if (!match) continue;

    out[i] = (match[0] ?? '') + language;
    addedCount += 1;
    if (strong) prevStrongLang = strong;
  }

  if (addedCount === 0) return { text, addedCount: 0 };
  return { text: out.join('\n'), addedCount };
}
