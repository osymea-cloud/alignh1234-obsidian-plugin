import { Modal, Setting } from 'obsidian';
import type { App } from 'obsidian';

class ConfirmModal extends Modal {
  private readonly message: string;
  private readonly confirmText: string;
  private readonly cancelText: string;
  private readonly resolve: (confirmed: boolean) => void;
  private settled = false;

  constructor(
    app: App,
    message: string,
    confirmText: string,
    cancelText: string,
    resolve: (confirmed: boolean) => void,
  ) {
    super(app);
    this.message = message;
    this.confirmText = confirmText;
    this.cancelText = cancelText;
    this.resolve = resolve;
  }

  override onOpen(): void {
    this.contentEl.createEl('p', { text: this.message });
    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText(this.cancelText).onClick(() => {
          this.settle(false);
          this.close();
        }),
      )
      .addButton((button) =>
        button
          .setButtonText(this.confirmText)
          .setCta()
          .onClick(() => {
            this.settle(true);
            this.close();
          }),
      );
  }

  override onClose(): void {
    this.contentEl.empty();
    this.settle(false);
  }

  private settle(confirmed: boolean): void {
    if (this.settled) return;
    this.settled = true;
    this.resolve(confirmed);
  }
}

/** 打开确认框，返回是否点击了确认（Esc / 点击遮罩视为取消） */
export function confirmAction(
  app: App,
  message: string,
  confirmText: string,
  cancelText: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    new ConfirmModal(app, message, confirmText, cancelText, resolve).open();
  });
}
