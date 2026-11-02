import type { H1RenumberSettings } from '../types.ts';
import { addCodeBlockLanguages } from './languageDetector.ts';
import { collapseBlankLines } from './blankLineCollapser.ts';
import { padBlockquotes } from './blockquotePadder.ts';
import { manageSeparators } from './separatorManager.ts';
import { renumberAll } from './renumberer.ts';

export interface OrganizeResult {
  /** 整理后的完整文本 */
  text: string;
  /** 是否有任何改动 */
  changed: boolean;
  /** 标题编号发生变化的行数（H1-H4 合计） */
  renumberChangedCount: number;
  /** 补上语言的代码块数量 */
  languageAddedCount: number;
  /** 合并的空行段数量 */
  blankLinesCollapsed: number;
  /** 块引用首尾补上的空 > 行数 */
  blockquotePaddedCount: number;
  /** 删除的分割线数量 */
  separatorsRemovedCount: number;
  /** 插入的分割线数量 */
  separatorsInsertedCount: number;
}

/**
 * v0.0.2 单命令「整理当前文档」的 pipeline：
 *
 * ① 编号 H1-H4（始终执行）
 * ② 补代码块语言（开关）
 * ③ 合并空行（开关）
 * ④ 块引用首尾补空 >（开关，v0.0.9）
 * ⑤ 分割线：先删旧、再插新（多选开关）
 *
 * 纯函数：不依赖 Obsidian，便于单元测试；最终文本由调用方一次性写回。
 */
export function organizeText(text: string, settings: H1RenumberSettings): OrganizeResult {
  const usesCrlf = text.includes('\r\n');
  let current = text;

  const renumber = renumberAll(current, settings);
  current = renumber.newText;

  let languageAddedCount = 0;
  if (settings.tidy.codeBlockLanguage) {
    const language = addCodeBlockLanguages(current);
    current = language.text;
    languageAddedCount = language.addedCount;
  }

  let blankLinesCollapsed = 0;
  if (settings.tidy.collapseBlankLines) {
    const blank = collapseBlankLines(current);
    current = blank.text;
    blankLinesCollapsed = blank.collapsedCount;
  }

  let blockquotePaddedCount = 0;
  if (settings.tidy.padBlockquotes) {
    const padded = padBlockquotes(current);
    current = padded.text;
    blockquotePaddedCount = padded.paddedCount;
  }

  let separatorsRemovedCount = 0;
  let separatorsInsertedCount = 0;
  const separators = settings.tidy.separators;
  if (separators.removeExisting || separators.insertBetweenH1 || separators.insertBetweenH2) {
    const managed = manageSeparators(current, separators);
    current = managed.text;
    separatorsRemovedCount = managed.removedCount;
    separatorsInsertedCount = managed.insertedCount;
  }

  const changed = current !== text;
  if (changed && usesCrlf) {
    current = current.replace(/\n/g, '\r\n');
  }

  return {
    text: current,
    changed,
    renumberChangedCount: renumber.changedCount,
    languageAddedCount,
    blankLinesCollapsed,
    blockquotePaddedCount,
    separatorsRemovedCount,
    separatorsInsertedCount,
  };
}
