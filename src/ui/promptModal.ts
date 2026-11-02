import { Modal, Setting, TextAreaComponent } from 'obsidian';
import type { App } from 'obsidian';

export interface PromptModalOptions {
  title: string;
  value: string;
  saveText: string;
  cancelText: string;
  /** textarea 行数，默认 8 */
  rows?: number;
}

class PromptModal extends Modal {
  private readonly options: PromptModalOptions;
  private readonly resolve: (value: string | null) => void;
  private settled = false;
  private textarea: TextAreaComponent | null = null;

  constructor(app: App, options: PromptModalOptions, resolve: (value: string | null) => void) {
    super(app);
    this.options = options;
    this.resolve = resolve;
  }

  override onOpen(): void {
    this.titleEl.setText(this.options.title);

    this.textarea = new TextAreaComponent(this.contentEl);
    this.textarea.setValue(this.options.value);
    this.textarea.inputEl.rows = this.options.rows ?? 8;
    this.textarea.inputEl.addClass('note-formatter-prompt-textarea');

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(this.options.cancelText).onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText(this.options.saveText)
          .setCta()
          .onClick(() => {
            this.settle(this.textarea?.getValue() ?? '');
            this.close();
          }),
      );
  }

  override onClose(): void {
    this.contentEl.empty();
    this.settle(null);
  }

  private settle(value: string | null): void {
    if (this.settled) return;
    this.settled = true;
    this.resolve(value);
  }
}

/** 打开多行文本编辑框；取消 / Esc / 点击遮罩返回 null */
export function promptForText(app: App, options: PromptModalOptions): Promise<string | null> {
  return new Promise((resolve) => {
    new PromptModal(app, options, resolve).open();
  });
}
