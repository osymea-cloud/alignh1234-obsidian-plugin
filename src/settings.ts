import { PluginSettingTab, Setting } from 'obsidian';
import type { App } from 'obsidian';
import type H1RenumberPlugin from '../main.ts';
import {
  DEFAULT_IMAGE_FOLDER,
  HEADING_LEVELS,
  MAX_INSERT_BLANK_LINES,
  MIN_INSERT_BLANK_LINES,
  NUMBERING_MODES,
  NUMBERING_STYLES,
  PLUGIN_LANGUAGES,
  TITLE_LANGUAGE_IDS,
  TITLE_LANGUAGE_MODES,
  clampInsertBlankLines,
  defaultGenerationPrompt,
  defaultThemePrompt,
  sanitizeImageFolder,
} from './types.ts';
import type {
  HeadingLevel,
  LlmProviderId,
  NumberingMode,
  NumberingStyle,
  PluginLanguage,
  TitleLanguageId,
  TitleLanguageMode,
  TitleSettings,
} from './types.ts';
import { DELIMITERS } from './core/delimiters.ts';
import type { Delimiter } from './core/delimiters.ts';
import { LLM_PROVIDERS } from './core/llm/providers.ts';
import { titleLanguageLabel } from './core/titleLanguage.ts';
import { PROVIDER_LABEL_KEYS, STYLE_LABEL_KEYS, t } from './i18n.ts';
import { promptForText } from './ui/promptModal.ts';

/** 分隔符在设置页里的展示文本 */
function delimiterLabel(delimiter: Delimiter, lang: PluginLanguage): string {
  if (delimiter.id === 'none') return t('delimiter.none', lang);
  if (delimiter.id === 'space') return t('delimiter.space', lang);
  const symbol =
    delimiter.prefix.length > 0 ? `${delimiter.prefix}1${delimiter.suffix}` : delimiter.suffix;
  const name = lang === 'en' ? delimiter.nameEn : delimiter.nameZh;
  return lang === 'en' ? `${symbol} (${name})` : `${symbol}（${name}）`;
}

export class H1RenumberSettingTab extends PluginSettingTab {
  private readonly plugin: H1RenumberPlugin;

  constructor(app: App, plugin: H1RenumberPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const lang = this.plugin.settings.language;
    const multi = this.plugin.settings.numberingMode === 'multi';

    this.renderLanguage(containerEl, lang);
    this.renderNumberingMode(containerEl, lang);
    this.renderSpaceAfterDelimiter(containerEl, lang);
    if (multi) {
      containerEl.createEl('p', {
        text: t('setting.numberingMode.multiHint', lang),
        cls: 'setting-item-description',
      });
    }
    for (const level of HEADING_LEVELS) {
      this.renderLevel(containerEl, level, lang, multi);
    }
    this.renderTidy(containerEl, lang);
    this.renderImageTidy(containerEl, lang);
    this.renderTitle(containerEl, lang);
    this.renderLlm(containerEl, lang);
  }

  private renderLanguage(containerEl: HTMLElement, lang: PluginLanguage): void {
    new Setting(containerEl)
      .setName(t('setting.language.name', lang))
      .setDesc(t('setting.language.desc', lang))
      .addDropdown((dropdown) => {
        for (const value of PLUGIN_LANGUAGES) {
          dropdown.addOption(
            value,
            t(value === 'zh' ? 'setting.language.zh' : 'setting.language.en', lang),
          );
        }
        dropdown.setValue(lang);
        dropdown.onChange(async (value) => {
          this.plugin.settings.language = value as PluginLanguage;
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }

  /** 编号模式：单级 / 多级（切换后重渲染，以置灰各级配置） */
  private renderNumberingMode(containerEl: HTMLElement, lang: PluginLanguage): void {
    new Setting(containerEl)
      .setName(t('setting.numberingMode.name', lang))
      .setDesc(t('setting.numberingMode.desc', lang))
      .addDropdown((dropdown) => {
        for (const mode of NUMBERING_MODES) {
          const key =
            mode === 'single' ? 'setting.numberingMode.single' : 'setting.numberingMode.multi';
          dropdown.addOption(mode, t(key, lang));
        }
        dropdown.setValue(this.plugin.settings.numberingMode);
        dropdown.onChange(async (value) => {
          this.plugin.settings.numberingMode = value as NumberingMode;
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }

  /** 全局开关：单级编号在分隔符后补一个空格 */
  private renderSpaceAfterDelimiter(containerEl: HTMLElement, lang: PluginLanguage): void {
    new Setting(containerEl)
      .setName(t('setting.spaceAfterDelimiter.name', lang))
      .setDesc(t('setting.spaceAfterDelimiter.desc', lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.spaceAfterDelimiter);
        toggle.onChange(async (value) => {
          this.plugin.settings.spaceAfterDelimiter = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderLevel(
    containerEl: HTMLElement,
    level: HeadingLevel,
    lang: PluginLanguage,
    disabled: boolean,
  ): void {
    new Setting(containerEl).setName(t('setting.level.heading', lang, { level })).setHeading();

    new Setting(containerEl)
      .setName(t('setting.level.styleName', lang))
      .setDesc(t('setting.level.styleDesc', lang, { level }))
      .addDropdown((dropdown) => {
        for (const style of NUMBERING_STYLES) {
          dropdown.addOption(style, t(STYLE_LABEL_KEYS[style], lang));
        }
        dropdown.setValue(this.plugin.settings.levels[level].style);
        dropdown.setDisabled(disabled);
        dropdown.onChange(async (value) => {
          this.plugin.settings.levels[level].style = value as NumberingStyle;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('setting.level.delimiterName', lang))
      .setDesc(t('setting.level.delimiterDesc', lang))
      .addDropdown((dropdown) => {
        for (const delimiter of DELIMITERS) {
          dropdown.addOption(delimiter.id, delimiterLabel(delimiter, lang));
        }
        dropdown.setValue(this.plugin.settings.levels[level].delimiterId);
        dropdown.setDisabled(disabled);
        dropdown.onChange(async (value) => {
          this.plugin.settings.levels[level].delimiterId = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderTidy(containerEl: HTMLElement, lang: PluginLanguage): void {
    new Setting(containerEl).setName(t('setting.tidy.heading', lang)).setHeading();

    new Setting(containerEl)
      .setName(t('setting.tidy.codeBlockLanguage.name', lang))
      .setDesc(t('setting.tidy.codeBlockLanguage.desc', lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.tidy.codeBlockLanguage);
        toggle.onChange(async (value) => {
          this.plugin.settings.tidy.codeBlockLanguage = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('setting.tidy.collapseBlankLines.name', lang))
      .setDesc(t('setting.tidy.collapseBlankLines.desc', lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.tidy.collapseBlankLines);
        toggle.onChange(async (value) => {
          this.plugin.settings.tidy.collapseBlankLines = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('setting.tidy.padBlockquotes.name', lang))
      .setDesc(t('setting.tidy.padBlockquotes.desc', lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.tidy.padBlockquotes);
        toggle.onChange(async (value) => {
          this.plugin.settings.tidy.padBlockquotes = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName(t('setting.tidy.separators.heading', lang)).setHeading();

    new Setting(containerEl)
      .setName(t('setting.tidy.separators.removeExisting.name', lang))
      .setDesc(t('setting.tidy.separators.removeExisting.desc', lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.tidy.separators.removeExisting);
        toggle.onChange(async (value) => {
          this.plugin.settings.tidy.separators.removeExisting = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('setting.tidy.separators.insertBetweenH1.name', lang))
      .setDesc(t('setting.tidy.separators.insertBetweenH1.desc', lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.tidy.separators.insertBetweenH1);
        toggle.onChange(async (value) => {
          this.plugin.settings.tidy.separators.insertBetweenH1 = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('setting.tidy.separators.insertBetweenH2.name', lang))
      .setDesc(t('setting.tidy.separators.insertBetweenH2.desc', lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.tidy.separators.insertBetweenH2);
        toggle.onChange(async (value) => {
          this.plugin.settings.tidy.separators.insertBetweenH2 = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('setting.insertBlankLines.name', lang))
      .setDesc(t('setting.insertBlankLines.desc', lang))
      .addSlider((slider) => {
        slider.setLimits(MIN_INSERT_BLANK_LINES, MAX_INSERT_BLANK_LINES, 1);
        slider.setValue(this.plugin.settings.insertBlankLines);
        slider.setDynamicTooltip();
        slider.onChange(async (value) => {
          this.plugin.settings.insertBlankLines = clampInsertBlankLines(
            value,
            this.plugin.settings.insertBlankLines,
          );
          await this.plugin.saveSettings();
        });
      });
  }

  /** 自动整理插入图片：开关 + 目标文件夹 */
  private renderImageTidy(containerEl: HTMLElement, lang: PluginLanguage): void {
    new Setting(containerEl).setName(t('setting.imageTidy.heading', lang)).setHeading();

    const imageTidy = this.plugin.settings.imageTidy;

    new Setting(containerEl)
      .setName(t('setting.imageTidy.enabled.name', lang))
      .setDesc(t('setting.imageTidy.enabled.desc', lang))
      .addToggle((toggle) => {
        toggle.setValue(imageTidy.enabled);
        toggle.onChange(async (value) => {
          this.plugin.settings.imageTidy.enabled = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('setting.imageTidy.folder.name', lang))
      .setDesc(t('setting.imageTidy.folder.desc', lang))
      .addText((text) => {
        text.setPlaceholder(t('setting.imageTidy.folder.placeholder', lang));
        text.setValue(imageTidy.folder);
        text.onChange(async (value) => {
          this.plugin.settings.imageTidy.folder = sanitizeImageFolder(value, DEFAULT_IMAGE_FOLDER);
          await this.plugin.saveSettings();
        });
      });
  }

  /** AI 标题内容：语言 / 逐级三开关 / 生成提示词 */
  private renderTitle(containerEl: HTMLElement, lang: PluginLanguage): void {
    new Setting(containerEl).setName(t('setting.title.heading', lang)).setHeading();

    const title = this.plugin.settings.title;

    new Setting(containerEl)
      .setName(t('setting.title.languageMode.name', lang))
      .setDesc(t('setting.title.languageMode.desc', lang))
      .addDropdown((dropdown) => {
        for (const mode of TITLE_LANGUAGE_MODES) {
          const key =
            mode === 'document'
              ? 'setting.title.languageMode.document'
              : 'setting.title.languageMode.custom';
          dropdown.addOption(mode, t(key, lang));
        }
        dropdown.setValue(title.languageMode);
        dropdown.onChange(async (value) => {
          this.plugin.settings.title.languageMode = value as TitleLanguageMode;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (title.languageMode === 'custom') {
      new Setting(containerEl)
        .setName(t('setting.title.customLanguage.name', lang))
        .setDesc(t('setting.title.customLanguage.desc', lang))
        .addDropdown((dropdown) => {
          for (const id of TITLE_LANGUAGE_IDS) {
            dropdown.addOption(id, titleLanguageLabel(id, lang));
          }
          dropdown.setValue(title.customLanguage);
          dropdown.onChange(async (value) => {
            this.plugin.settings.title.customLanguage = value as TitleLanguageId;
            await this.plugin.saveSettings();
          });
        });
    }

    for (const level of HEADING_LEVELS) {
      this.renderTitleLevel(containerEl, level, lang);
    }

    this.renderTitlePrompts(containerEl, lang, title);
  }

  /** 单个级别的 emoji / 主题 / 总结开关（至少一个） */
  private renderTitleLevel(
    containerEl: HTMLElement,
    level: HeadingLevel,
    lang: PluginLanguage,
  ): void {
    const config = this.plugin.settings.title.levels[level];
    const invalid = !config.includeEmoji && !config.includeTheme && !config.includeSummary;

    const heading = new Setting(containerEl)
      .setName(t('setting.title.level.heading', lang, { level }))
      .setDesc(
        invalid
          ? t('setting.title.level.invalid', lang, { level })
          : t('setting.title.level.desc', lang),
      );
    if (invalid) heading.settingEl.classList.add('mod-warning');

    const toggles = [
      {
        key: 'includeEmoji' as const,
        name: 'setting.title.level.emoji' as const,
        desc: 'setting.title.level.emoji.desc' as const,
      },
      {
        key: 'includeTheme' as const,
        name: 'setting.title.level.theme' as const,
        desc: 'setting.title.level.theme.desc' as const,
      },
      {
        key: 'includeSummary' as const,
        name: 'setting.title.level.summary' as const,
        desc: 'setting.title.level.summary.desc' as const,
      },
    ];

    for (const toggle of toggles) {
      new Setting(containerEl)
        .setName(t(toggle.name, lang))
        .setDesc(t(toggle.desc, lang))
        .addToggle((component) => {
          component.setValue(config[toggle.key]);
          component.onChange(async (value) => {
            this.plugin.settings.title.levels[level][toggle.key] = value;
            await this.plugin.saveSettings();

            const updated = this.plugin.settings.title.levels[level];
            const nowInvalid =
              !updated.includeEmoji && !updated.includeTheme && !updated.includeSummary;
            heading.setDesc(
              nowInvalid
                ? t('setting.title.level.invalid', lang, { level })
                : t('setting.title.level.desc', lang),
            );
            heading.settingEl.classList.toggle('mod-warning', nowInvalid);
          });
        });
    }
  }

  /** 提示词设置：只读预览 + 弹窗修改 + 初始化 */
  private renderPromptSetting(
    containerEl: HTMLElement,
    lang: PluginLanguage,
    options: {
      value: string;
      fallback: string;
      name: string;
      desc: string;
      modalTitle: string;
      emptyHint: string;
      onChange: (value: string) => Promise<void>;
      onReset: () => Promise<void>;
    },
  ): void {
    const effective = options.value.trim() || options.fallback;

    const setting = new Setting(containerEl).setName(options.name).setDesc(options.desc);

    setting.addButton((button) => {
      button.setButtonText(t('setting.title.prompt.edit', lang));
      button.onClick(async () => {
        const value = await promptForText(this.app, {
          title: options.modalTitle,
          value: effective,
          saveText: t('setting.title.prompt.save', lang),
          cancelText: t('confirm.cancel', lang),
        });
        if (value === null) return;
        await options.onChange(value);
        this.display();
      });
    });

    setting.addButton((button) => {
      button.setButtonText(t('setting.title.prompt.reset', lang));
      button.onClick(async () => {
        await options.onReset();
        this.display();
      });
    });

    containerEl.createEl('p', {
      cls: 'setting-item-description alignh1234-prompt-preview',
      text: effective,
    });

    if (!options.value.trim()) {
      containerEl.createEl('p', {
        text: options.emptyHint,
        cls: 'setting-item-description mod-warning',
      });
    }
  }

  /** 标题生成提示词 + 主题生成提示词 */
  private renderTitlePrompts(
    containerEl: HTMLElement,
    lang: PluginLanguage,
    title: TitleSettings,
  ): void {
    this.renderPromptSetting(containerEl, lang, {
      value: title.generationPrompt,
      fallback: defaultGenerationPrompt(lang),
      name: t('setting.title.prompt.name', lang),
      desc: t('setting.title.prompt.desc', lang),
      modalTitle: t('setting.title.prompt.modalTitle', lang),
      emptyHint: t('setting.title.prompt.emptyHint', lang),
      onChange: async (value) => {
        this.plugin.settings.title.generationPrompt = value;
        await this.plugin.saveSettings();
      },
      onReset: async () => {
        this.plugin.settings.title.generationPrompt = defaultGenerationPrompt(lang);
        await this.plugin.saveSettings();
      },
    });

    this.renderPromptSetting(containerEl, lang, {
      value: title.themePrompt,
      fallback: defaultThemePrompt(lang),
      name: t('setting.title.themePrompt.name', lang),
      desc: t('setting.title.themePrompt.desc', lang),
      modalTitle: t('setting.title.themePrompt.modalTitle', lang),
      emptyHint: t('setting.title.themePrompt.emptyHint', lang),
      onChange: async (value) => {
        this.plugin.settings.title.themePrompt = value;
        await this.plugin.saveSettings();
      },
      onReset: async () => {
        this.plugin.settings.title.themePrompt = defaultThemePrompt(lang);
        await this.plugin.saveSettings();
      },
    });
  }

  /** AI 服务商 + API Key（掩码显示，可清除） */
  private renderLlm(containerEl: HTMLElement, lang: PluginLanguage): void {
    new Setting(containerEl).setName(t('setting.llm.heading', lang)).setHeading();

    const llm = this.plugin.settings.llm;

    new Setting(containerEl)
      .setName(t('setting.llm.provider.name', lang))
      .setDesc(t('setting.llm.provider.desc', lang))
      .addDropdown((dropdown) => {
        for (const provider of LLM_PROVIDERS) {
          dropdown.addOption(provider.id, t(PROVIDER_LABEL_KEYS[provider.id], lang));
        }
        dropdown.setValue(llm.provider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.llm.provider = value as LlmProviderId;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('setting.llm.apiKey.name', lang))
      .setDesc(t('setting.llm.apiKey.desc', lang))
      .addText((text) => {
        text.inputEl.type = 'password';
        text.setPlaceholder(t('setting.llm.apiKey.placeholder', lang));
        text.setValue(llm.apiKey);
        text.onChange(async (value) => {
          this.plugin.settings.llm.apiKey = value;
          await this.plugin.saveSettings();
        });
      })
      .addButton((button) => {
        button.setButtonText(t('setting.llm.clearApiKey', lang));
        button.onClick(async () => {
          this.plugin.settings.llm.apiKey = '';
          await this.plugin.saveSettings();
          this.display();
        });
      });

    containerEl.createEl('p', {
      text: t('setting.llm.securityHint', lang),
      cls: 'setting-item-description',
    });
  }
}