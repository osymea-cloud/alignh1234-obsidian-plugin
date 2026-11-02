import type { Editor } from 'obsidian';
import type { LineEdit } from '../types.ts';

/**
 * 用一次 Editor 事务写回所有行改动，保证可以一次性撤销。
 * 只替换发生变化的整行，其余内容保持原样。
 */
export function applyLineEdits(editor: Editor, edits: LineEdit[]): void {
  if (edits.length === 0) return;

  const changes = edits.map((edit) => {
    const currentLine = editor.getLine(edit.lineIndex);
    return {
      from: { line: edit.lineIndex, ch: 0 },
      to: { line: edit.lineIndex, ch: currentLine.length },
      text: edit.newText,
    };
  });

  editor.transaction({ changes });
}

/**
 * 用一次 Editor 事务替换整篇文档（v0.0.2 整理命令使用）。
 * 单事务写回，可一次撤销。
 */
export function applyDocumentText(editor: Editor, newText: string): void {
  if (newText === editor.getValue()) return;

  const lastLine = editor.lastLine();
  const lastCh = editor.getLine(lastLine).length;

  editor.transaction({
    changes: [
      {
        from: { line: 0, ch: 0 },
        to: { line: lastLine, ch: lastCh },
        text: newText,
      },
    ],
  });
}

