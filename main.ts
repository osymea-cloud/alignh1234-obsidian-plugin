import { Notice, Plugin, TFile, requestUrl } from 'obsidian';
import type { Editor } from 'obsidian';
import { createDefaultSettings, normalizeSettings } from './src/types.ts';
import type { H1RenumberSettings, PluginLanguage } from './src/types.ts';
import { organizeText } from './src/core/organizer.ts';
import type { OrganizeResult } from './src/core/organizer.ts';
import { findParagraph } from './src/core/paragraph.ts';
import { collectImageEmbeds, isImagePath, rewriteImageEmbeds } from './src/core/imageEmbeds.ts';
import { applyDocumentText } from './src/editor/applyEdit.ts';
import { H1RenumberSettingTab } from './src/settings.ts';
import { t } from './src/i18n.ts';
import { chat } from './src/core/llm/client.ts';
import type { LlmRequestFn } from './src/core/llm/client.ts';
import { getLlmProvider } from './src/core/llm/providers.ts';
import {
  applyTitles,
  buildPrompt,
  extractDocumentOutline,
  getInvalidTitleLevels,
  parseTitlesResponse,
} from './src/core/titleRegenerator.ts';
import { confirmAction } from './src/ui/confirmModal.ts';

/** 把 Obsidian 的 requestUrl 适配成 client.ts 的纯函数依赖 */
const requestToObsidian: LlmRequestFn = async ({ url, method, headers, body }) => {
  const response = await requestUrl({ url, method, headers, body, throw: false });
  return { status: response.status, text: response.text };
};

export default class H1RenumberPlugin extends Plugin {
  override settings: H1RenumberSettings = createDefaultSettings();

  /** 图片嵌入基线：笔记路径 → 上次见到（或刚写完）的嵌入目标 */
  private readonly embedCache = new Map<string, string[]>();

  /** 自己改写链接时的事件去重（避免 modify → 改写 → modify 循环） */
  private readonly imageTidyBusy = new Set<string>();

  override async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new H1RenumberSettingTab(this.app, this));

    const lang = this.settings.language;
    this.addCommand({
      id: 'organize-current-document',
      name: t('command.organize', lang),
      editorCallback: (editor) => this.organizeDocument(editor),
    });

    this.addCommand({
      id: 'regenerate-headings',
      name: t('command.regenerateTitles', lang),
      editorCallback: (editor) => this.regenerateHeadings(editor),
    });

    this.addCommand({
      id: 'insert-blank-lines',
      name: t('command.insertBlankLines', lang),
      editorCallback: (editor) => this.insertBlankLines(editor),
    });

    // 图片自动整理：先建立基线（打开笔记 / 启动后当前笔记），再对后续保存做增量
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        this.primeImageCache(file);
      }),
    );
    this.app.workspace.onLayoutReady(() => {
      this.primeImageCache(this.app.workspace.getActiveFile());
    });

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        void this.tidyImages(file);
      }),
    );
  }

  /** 整理结果 → Notice 片段（省略计数为 0 的动作） */
  private organizeParts(result: OrganizeResult, lang: PluginLanguage): string[] {
    const parts: string[] = [];
    if (result.renumberChangedCount > 0) {
      parts.push(t('notice.renumbered', lang, { count: result.renumberChangedCount }));
    }
    if (result.languageAddedCount > 0) {
      parts.push(t('notice.languageAdded', lang, { count: result.languageAddedCount }));
    }
    if (result.blankLinesCollapsed > 0) {
      parts.push(t('notice.blankLinesCollapsed', lang, { count: result.blankLinesCollapsed }));
    }
    if (result.blockquotePaddedCount > 0) {
      parts.push(t('notice.blockquotePadded', lang, { count: result.blockquotePaddedCount }));
    }
    if (result.separatorsRemovedCount > 0) {
      parts.push(t('notice.separatorsRemoved', lang, { count: result.separatorsRemovedCount }));
    }
    if (result.separatorsInsertedCount > 0) {
      parts.push(t('notice.separatorsInserted', lang, { count: result.separatorsInsertedCount }));
    }
    return parts;
  }

  private partSeparator(lang: PluginLanguage): string {
    return lang === 'zh' ? '，' : ', ';
  }

  /** 单命令：编号始终执行，其它整理动作按设置开关执行 */
  private organizeDocument(editor: Editor): void {
    const lang = this.settings.language;
    const result = organizeText(editor.getValue(), this.settings);

    if (!result.changed) {
      new Notice(t('notice.noChange', lang));
      return;
    }

    applyDocumentText(editor, result.text);

    const summary =
      this.organizeParts(result, lang).join(this.partSeparator(lang)) ||
      t('notice.formatUpdated', lang);
    new Notice(t('notice.organized', lang, { parts: summary }));
  }

  /** 命令：在光标所在段落的最后一行之后插入 N 个空白行（单事务，可一次撤销） */
  private insertBlankLines(editor: Editor): void {
    const lang = this.settings.language;
    const cursor = editor.getCursor();
    const paragraph = findParagraph(editor.getValue(), cursor.line);

    if (!paragraph) {
      new Notice(t('notice.noParagraph', lang));
      return;
    }

    const count = this.settings.insertBlankLines;
    const line = paragraph.end;
    const ch = editor.getLine(line).length;

    editor.transaction({
      changes: [
        {
          from: { line, ch },
          to: { line, ch },
          text: '\n'.repeat(count),
        },
      ],
    });

    new Notice(t('notice.blankLinesInserted', lang, { count }));
  }

  /** 独立命令：调用 AI 按正文重新生成标题（与「整理当前文档」互不触发） */
  private async regenerateHeadings(editor: Editor): Promise<void> {
    const lang = this.settings.language;
    const text = editor.getValue();
    const outline = extractDocumentOutline(text);

    if (outline.length === 0) {
      new Notice(t('notice.noHeadings', lang));
      return;
    }

    const invalidLevels = getInvalidTitleLevels(this.settings.title);
    if (invalidLevels.length > 0) {
      const levels = invalidLevels.map((level) => `H${level}`).join(lang === 'zh' ? '、' : ', ');
      new Notice(t('notice.invalidTitleSettings', lang, { levels }));
      return;
    }

    const apiKey = this.settings.llm.apiKey.trim();
    if (!apiKey) {
      new Notice(t('notice.noApiKey', lang));
      return;
    }

    const provider = getLlmProvider(this.settings.llm.provider);
    if (!provider) {
      new Notice(t('notice.unknownProvider', lang));
      return;
    }

    const confirmed = await confirmAction(
      this.app,
      t('confirm.regenerate.message', lang, { count: outline.length }),
      t('confirm.regenerate.confirm', lang),
      t('confirm.cancel', lang),
    );
    if (!confirmed) return;

    new Notice(t('notice.generating', lang, { count: outline.length }));

    try {
      const prompt = buildPrompt(outline, this.settings);
      const raw = await chat(provider, apiKey, prompt, requestToObsidian);
      const titles = parseTitlesResponse(raw, outline.length);
      const titled = applyTitles(text, outline, titles, this.settings.title);

      // v0.0.9：AI 改完标题后接着跑完整的整理 pipeline（编号 / 空行 / 块引用 / 分割线），一次写回
      const organized = organizeText(titled.text, this.settings);

      if (titled.changedCount === 0 && !organized.changed) {
        new Notice(t('notice.titlesUnchanged', lang));
        return;
      }

      applyDocumentText(editor, organized.text);

      const organizeParts = this.organizeParts(organized, lang);
      if (titled.changedCount === 0) {
        // 标题没变，只有整理动了文档
        new Notice(
          t('notice.organized', lang, {
            parts: organizeParts.join(this.partSeparator(lang)) || t('notice.formatUpdated', lang),
          }),
        );
        return;
      }

      const parts = [
        t('notice.titlesRegenerated', lang, { count: titled.changedCount }),
        ...organizeParts,
      ];
      new Notice(
        t('notice.regeneratedAndOrganized', lang, { parts: parts.join(this.partSeparator(lang)) }),
      );
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      // 网络错误信息可能包含 Gemini 的 ?key=…，统一脱敏
      const message = rawMessage.split(apiKey).join('***');
      new Notice(t('notice.llmError', lang, { message }));
    }
  }

  /** 建立某篇笔记的图片嵌入基线（只读一次；已有基线不覆盖） */
  private primeImageCache(file: TFile | null): void {
    if (!file || file.extension !== 'md') return;
    if (this.embedCache.has(file.path)) return;

    void this.app.vault
      .read(file)
      .then((content) => {
        if (this.embedCache.has(file.path)) return;
        this.embedCache.set(file.path, this.embedTargets(content));
      })
      .catch(() => {
        // 读取失败就不建基线：下次 modify 会重新尝试
      });
  }

  private embedTargets(content: string): string[] {
    return collectImageEmbeds(content).map((embed) => embed.target);
  }

  /**
   * 自动整理插入图片：笔记保存时对比上一次看到的嵌入，只处理「本页新增」且「未归档」的图片。
   *
   * 流程：解析新目标 → 复制到图片文件夹 → 改写链接 → 原图移入回收站（移动语义）。
   * 改写链接由自己触发，用 busy 标记 + 写完立即更新基线避免自我循环。
   */
  private async tidyImages(file: unknown): Promise<void> {
    if (!this.settings.imageTidy.enabled) return;
    if (!(file instanceof TFile) || file.extension !== 'md') return;
    if (this.imageTidyBusy.has(file.path)) return;

    this.imageTidyBusy.add(file.path);
    try {
      const content = await this.app.vault.read(file);
      const targets = this.embedTargets(content);
      const previous = this.embedCache.get(file.path);

      // 没有基线（刚安装 / 刚启用）：只记录，不搬家，避免整篇历史图片被批量移动
      if (previous === undefined) {
        this.embedCache.set(file.path, targets);
        return;
      }

      const added = targets.filter((target) => !previous.includes(target));
      if (added.length === 0) {
        this.embedCache.set(file.path, targets);
        return;
      }

      await this.relocateImages(file, targets, added);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(t('notice.imageTidyFailed', this.settings.language, { message }));
    } finally {
      this.imageTidyBusy.delete(file.path);
    }
  }

  /** 把 `added` 里的图片移动到 `<笔记目录>/<imageTidy.folder>/`，并改写这些链接 */
  private async relocateImages(note: TFile, targets: string[], added: string[]): Promise<void> {
    const lang = this.settings.language;
    const folder = this.settings.imageTidy.folder;
    const notesDir = note.parent?.path ?? '';
    const destFolder = notesDir && notesDir !== '/' ? `${notesDir}/${folder}` : folder;

    // 先解析：解析不到文件的（如刚粘贴还没落盘）不进基线，下次保存会重试
    const resolved = new Map<string, TFile | null>();
    for (const target of added) {
      resolved.set(target, this.app.metadataCache.getFirstLinkpathDest(target, note.path));
    }

    const candidates = new Map<string, TFile>();
    for (const image of resolved.values()) {
      if (!image || !isImagePath(image.path)) continue;
      if ((image.parent?.path ?? '') === destFolder) continue;
      candidates.set(image.path, image);
    }

    if (candidates.size === 0) {
      this.embedCache.set(note.path, targets.filter((target) => resolved.get(target)));
      return;
    }

    if (await this.ensureFolder(destFolder)) {
      new Notice(t('notice.imageFolderCreated', lang, { folder: destFolder }));
    }

    const movedTo = new Map<string, string>();
    const sources: TFile[] = [];
    for (const image of candidates.values()) {
      const destination = this.uniqueImagePath(destFolder, image.name);
      await this.copyFile(image, destination);
      movedTo.set(image.path, destination);
      sources.push(image);
    }

    const rename = new Map<string, string>();
    for (const target of added) {
      const image = resolved.get(target);
      if (!image) continue;
      const destination = movedTo.get(image.path);
      if (!destination) continue;
      rename.set(target, this.linkPath(destination, notesDir));
    }

    if (rename.size === 0) return;

    const updated = await this.app.vault.process(note, (data) => rewriteImageEmbeds(data, rename));
    for (const image of sources) {
      await this.app.fileManager.trashFile(image);
    }

    this.embedCache.set(note.path, this.embedTargets(updated));
    new Notice(t('notice.imagesMoved', lang, { count: sources.length, folder: destFolder }));
  }

  /**
   * 复制文件：`Vault.copy` 需要 Obsidian 1.8.7+，而本插件 minAppVersion 是 1.6.6，
   * 这里用「读二进制 + 写二进制」实现同等语义，保持旧版本可用。
   */
  private async copyFile(source: TFile, destination: string): Promise<void> {
    const data = await this.app.vault.readBinary(source);
    await this.app.vault.createBinary(destination, data);
  }

  /** 逐级创建文件夹，返回是否真的新建了（用于 Notice） */
  private async ensureFolder(path: string): Promise<boolean> {
    let created = false;
    let current = '';
    for (const segment of path.split('/').filter((part) => part.length > 0)) {
      current = current ? `${current}/${segment}` : segment;
      if (this.app.vault.getAbstractFileByPath(current)) continue;
      await this.app.vault.createFolder(current);
      created = true;
    }
    return created;
  }

  /** 目标重名时追加 ` 1` / ` 2`…，避免覆盖已有图片 */
  private uniqueImagePath(folder: string, name: string): string {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : '';

    let candidate = `${folder}/${name}`;
    let index = 1;
    while (this.app.vault.getAbstractFileByPath(candidate)) {
      candidate = `${folder}/${base} ${index}${extension}`;
      index += 1;
      if (index > 999) throw new Error(`无法为 ${name} 生成唯一文件名`);
    }
    return candidate;
  }

  /** 写进链接的路径：在笔记目录下用相对路径，否则用仓库内绝对路径 */
  private linkPath(destination: string, notesDir: string): string {
    if (notesDir && notesDir !== '/' && destination.startsWith(`${notesDir}/`)) {
      return destination.slice(notesDir.length + 1);
    }
    return destination;
  }

  async loadSettings(): Promise<void> {
    const data: unknown = await this.loadData();
    this.settings = normalizeSettings(data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}