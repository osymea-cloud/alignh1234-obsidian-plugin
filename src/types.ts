import { delimiterIdFromLegacyChar, isDelimiterId } from './core/delimiters.ts';

/** 标题级别：H1-H4 */
export type HeadingLevel = 1 | 2 | 3 | 4;

/** 界面语言 */
export const PLUGIN_LANGUAGES = ['zh', 'en'] as const;
export type PluginLanguage = (typeof PLUGIN_LANGUAGES)[number];

/**
 * 编号模式：
 * - single：每级独立编号（H1=一、 H2=一、 …，风格/分隔符逐级可配）
 * - multi：多级编号（1 / 1.1 / 1.1.1 / 1.1.1.1，固定阿拉伯 + 点 + 空格）
 */
export const NUMBERING_MODES = ['single', 'multi'] as const;
export type NumberingMode = (typeof NUMBERING_MODES)[number];

/** AI 标题生成支持的服务商 */
export const LLM_PROVIDER_IDS = ['claude', 'deepseek', 'gemini', 'gpt', 'qwen', 'kimi'] as const;
export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

/** 全部编号体系 id（与 core/numberSystems 注册表保持一致） */
export const NUMBER_SYSTEM_IDS = [
  'chinese',
  'arabic',
  'roman-upper',
  'roman-lower',
  'latin-upper',
  'latin-lower',
  'circled',
  'circled-hangul',
  'hangul',
  'cyrillic',
  'katakana',
  'eastern-arabic',
] as const;
export type NumberSystemId = (typeof NUMBER_SYSTEM_IDS)[number];

/** 编号风格：12 种体系 + 清除编号 */
export const NUMBERING_STYLES = [...NUMBER_SYSTEM_IDS, 'none'] as const;
export type NumberingStyle = (typeof NUMBERING_STYLES)[number];

/**
 * 补号策略：
 * - always：无编号也补号（H1-H4 默认）
 * - consistent：组内一致——整组有编号则重排，存在任一无编号则整组清空编号（预留）
 * - never：预留——无编号跳过，只重排已有编号
 */
export type FillPolicy = 'always' | 'consistent' | 'never';

/** 标题语言模式：跟随文档 / 指定语言 */
export const TITLE_LANGUAGE_MODES = ['document', 'custom'] as const;
export type TitleLanguageMode = (typeof TITLE_LANGUAGE_MODES)[number];

/** 标题生成可选的 11 种语言（与 core/titleLanguage.ts 注册表一致） */
export const TITLE_LANGUAGE_IDS = [
  'zh',
  'en',
  'ja',
  'ko',
  'es',
  'fr',
  'de',
  'pt',
  'ru',
  'it',
  'ar',
] as const;
export type TitleLanguageId = (typeof TITLE_LANGUAGE_IDS)[number];

/** 单个标题级别的配置 */
export interface LevelConfig {
  /** 生成新编号时使用的体系 */
  style: NumberingStyle;
  /** 生成新编号时使用的分隔符 id（见 core/delimiters.ts） */
  delimiterId: string;
  /** 无编号标题的补号策略 */
  fillPolicy: FillPolicy;
}

/** 分割线整理选项（多选，3 个独立开关） */
export interface SeparatorTidyOptions {
  /** 删除文档中现有的分割线 */
  removeExisting: boolean;
  /** 在两个一级标题之间插入分割线 */
  insertBetweenH1: boolean;
  /** 在两个二级标题之间插入分割线 */
  insertBetweenH2: boolean;
}

/** 单命令「整理当前文档」的附加动作开关 */
export interface TidySettings {
  /** 自动补全缺少语言的围栏代码块 */
  codeBlockLanguage: boolean;
  /** 把连续 3+ 个换行合并成 1 个空行 */
  collapseBlankLines: boolean;
  /** 为 > 块引用的首尾各补一行空 > */
  padBlockquotes: boolean;
  separators: SeparatorTidyOptions;
}

/**
 * 自动整理插入图片位置：
 * 笔记里新增图片嵌入后，把图片移动到笔记旁的图片文件夹，并改写链接。
 */
export interface ImageTidySettings {
  /** 是否启用 */
  enabled: boolean;
  /** 目标文件夹（相对笔记所在目录；支持 a/b 多级） */
  folder: string;
}

/** 单个标题级别生成的内容（三开关独立可选，至少一个） */
export interface TitleLevelConfig {
  /** 生成 emoji（替换原标题开头的 emoji） */
  includeEmoji: boolean;
  /** 生成「讨论主题」 */
  includeTheme: boolean;
  /** 生成「：一句话总结」 */
  includeSummary: boolean;
}

/** AI 标题生成配置：语言 + 生成提示词 + 逐级内容开关 */
export interface TitleSettings {
  /** document：由 AI 按文档主要语言输出；custom：使用 customLanguage */
  languageMode: TitleLanguageMode;
  /** languageMode = custom 时生效 */
  customLanguage: TitleLanguageId;
  /** 「一句话总结」的生成要求（空 → 按插件语言回退默认） */
  generationPrompt: string;
  /** 「讨论主题」的生成要求（空 → 按插件语言回退默认） */
  themePrompt: string;
  /** H1-H4 各自生成哪些内容 */
  levels: Record<HeadingLevel, TitleLevelConfig>;
}

/** 插件设置：界面语言 + 编号模式 + 每个标题级别各自独立配置 + 整理开关 */
export interface H1RenumberSettings {
  language: PluginLanguage;
  /** 单级 / 多级编号（多级时 levels 不生效） */
  numberingMode: NumberingMode;
  /** 单级编号在分隔符后补一个空格（多级固定带空格，与开关无关） */
  spaceAfterDelimiter: boolean;
  levels: Record<HeadingLevel, LevelConfig>;
  tidy: TidySettings;
  /** 「在本段后插入空白行」一次插入的空白行数（1..100） */
  insertBlankLines: number;
  /** 自动整理插入图片位置 */
  imageTidy: ImageTidySettings;
  /** AI 标题生成配置（语言 / 提示词 / 逐级内容） */
  title: TitleSettings;
  /** AI 服务商与 API Key */
  llm: LlmSettings;
}

/** 多级编号 token（如 `1.1.1 `）：路径各段 + 原始文本（含末尾空白） */
export interface MultiNumber {
  /** 各层级序号，如 `1.1.1 ` → [1, 1, 1] */
  path: number[];
  /** 原始编号 token（含末尾空白），用于回显/调试 */
  raw: string;
}

/** 标题的三段式解析结果 */
export interface ParsedHeading {
  /** 编号前的前导 emoji（含其后空白），无则空串 */
  emojiPrefix: string;
  /** 已有单级编号（含分隔符），无则 null */
  number: { value: number; raw: string } | null;
  /** 已有多级编号（`1.1 ` 之类），无则 null */
  multiNumber: MultiNumber | null;
  /** 去掉 emoji 前缀与编号后的标题正文 */
  content: string;
}

/** 扫描到的标题行 */
export interface ScannedHeading {
  /** 行号（0 起） */
  lineIndex: number;
  /** 标题级别（1-4） */
  level: HeadingLevel;
  /** 行首到标题文本之前的原始前缀，例如 "# " / "## " / "  ### " */
  prefix: string;
  /** 标题文本（不含前缀） */
  titleText: string;
}

/** 需要写回编辑器的一行改动 */
export interface LineEdit {
  lineIndex: number;
  newText: string;
}

export interface RenumberResult {
  /** 只包含发生变化的行 */
  edits: LineEdit[];
  /** 应用改动后的完整文本（便于测试与调试） */
  newText: string;
  /** 扫描到的目标级别标题总数 */
  headingCount: number;
  /** 发生变化的标题数量 */
  changedCount: number;
}

/** 合法的标题级别 */
export const HEADING_LEVELS: readonly HeadingLevel[] = [1, 2, 3, 4];

/** 合法的补号策略 */
export const FILL_POLICIES: readonly FillPolicy[] = ['always', 'consistent', 'never'];

/** 默认的逐级配置：H1-H4 全部补号 */
export const DEFAULT_LEVELS: Record<HeadingLevel, LevelConfig> = {
  1: { style: 'chinese', delimiterId: 'dunhao', fillPolicy: 'always' },
  2: { style: 'chinese', delimiterId: 'dunhao', fillPolicy: 'always' },
  3: { style: 'chinese', delimiterId: 'dunhao', fillPolicy: 'always' },
  4: { style: 'chinese', delimiterId: 'dunhao', fillPolicy: 'always' },
};

/** 默认界面语言 */
export const DEFAULT_LANGUAGE: PluginLanguage = 'zh';

/** 默认编号模式：单级（v0.0.3 行为，旧数据零影响） */
export const DEFAULT_NUMBERING_MODE: NumberingMode = 'single';

/** 默认的整理开关：全部关闭，单命令只做编号 */
export const DEFAULT_TIDY: TidySettings = {
  codeBlockLanguage: false,
  collapseBlankLines: false,
  padBlockquotes: false,
  separators: {
    removeExisting: false,
    insertBetweenH1: false,
    insertBetweenH2: false,
  },
};

/** 默认不在分隔符后补空格（保持 v0.0.8 行为） */
export const DEFAULT_SPACE_AFTER_DELIMITER = false;

/** 「在本段后插入空白行」的插入行数范围与默认值 */
export const MIN_INSERT_BLANK_LINES = 1;
export const MAX_INSERT_BLANK_LINES = 100;
export const DEFAULT_INSERT_BLANK_LINES = 20;

/** 图片归档文件夹的默认名 */
export const DEFAULT_IMAGE_FOLDER = 'picture';

/** 默认图片自动整理：关闭，文件夹 picture */
export const DEFAULT_IMAGE_TIDY: ImageTidySettings = {
  enabled: false,
  folder: DEFAULT_IMAGE_FOLDER,
};

/** 标题生成提示词默认文案（中文界面，v0.0.8） */
export const DEFAULT_GENERATION_PROMPT_ZH =
  '借鉴类与对象的命名的逻辑，尽量枚举对象。使用通俗语言一句话体现重要性，不要使用专业名词；不超过20个字。注意符合事实。';

/** 标题生成提示词默认文案（英文界面，v0.0.8） */
export const DEFAULT_GENERATION_PROMPT_EN =
  'Draw on the naming logic of classes and objects, and enumerate objects as much as possible. Use plain language to convey the importance in one sentence; avoid technical terms. No more than 20 words. Stay factually accurate.';

/**
 * 旧版默认文案（仅用于迁移；trim 后完全一致时按同语言升级为新默认）。
 * 含 v0.0.6 之前的更旧默认与 v0.0.7 默认。
 */
const LEGACY_GENERATION_PROMPTS: ReadonlyMap<string, string> = new Map([
  [
    '通俗易懂，避免专业名词堆砌；一句话总结要提炼关键信息、提及主要动作或名词；引出正文并体现正文与"讨论主题"的关联性。',
    DEFAULT_GENERATION_PROMPT_ZH,
  ],
  [
    'Plain and easy to understand; avoid stacking technical jargon. The one-sentence summary should distill the key information and mention the main action or noun; it should lead into the body and reflect how the body relates to the discussion topic.',
    DEFAULT_GENERATION_PROMPT_EN,
  ],
  [
    '借鉴类与对象的命名的逻辑，尽量枚举对象。通俗易懂；一句话总结要提炼关键信息、第一性原理。不超过20个字。',
    DEFAULT_GENERATION_PROMPT_ZH,
  ],
  [
    'Draw on the naming logic of classes and objects, and enumerate objects as much as possible. Keep it plain and easy to understand; the one-sentence summary should distill the key information and first principles. No more than 20 words.',
    DEFAULT_GENERATION_PROMPT_EN,
  ],
]);

/** 升级旧默认文案；自定义文案与空串原样保留 */
function migrateGenerationPrompt(value: string): string {
  return LEGACY_GENERATION_PROMPTS.get(value.trim()) ?? value;
}

/** 按插件界面语言取默认生成提示词 */
export function defaultGenerationPrompt(lang: PluginLanguage): string {
  return lang === 'en' ? DEFAULT_GENERATION_PROMPT_EN : DEFAULT_GENERATION_PROMPT_ZH;
}

/** 主题生成提示词默认文案（中文界面，v0.0.8） */
export const DEFAULT_THEME_PROMPT_ZH =
  '如果正文解释的某一概念，则为概念名称；如果正文回答某一问题，则为问题；优先使用‘优点’、‘缺点’，‘对比’，‘背景’，‘实际’，‘与’之类的词';

/** 主题生成提示词默认文案（英文界面，v0.0.8） */
export const DEFAULT_THEME_PROMPT_EN =
  "If the body explains a concept, use the concept name; if the body answers a question, use the question. Prefer words such as 'advantages', 'disadvantages', 'comparison', 'background', 'practice', and 'with'.";

/** v0.0.7 主题提示词默认文案（仅用于迁移） */
const LEGACY_THEME_PROMPTS: ReadonlyMap<string, string> = new Map([
  [
    '借鉴类与对象的命名的逻辑，作为类名。如果正文解释的某一概念，则为概念名称；如果正文回答某一问题，则为问题；尽量使用‘优点’、‘缺点’，‘对比’，‘背景’，‘实际’，‘与’之类的词',
    DEFAULT_THEME_PROMPT_ZH,
  ],
  [
    "Follow the naming logic of classes and objects: treat it as a class name. If the body explains a concept, use the concept name; if the body answers a question, use the question. Prefer words such as 'advantages', 'disadvantages', 'comparison', 'background', 'practice', and 'with'.",
    DEFAULT_THEME_PROMPT_EN,
  ],
]);

/** 升级旧默认主题文案；自定义文案与空串原样保留 */
function migrateThemePrompt(value: string): string {
  return LEGACY_THEME_PROMPTS.get(value.trim()) ?? value;
}

/** 按插件界面语言取默认主题生成提示词 */
export function defaultThemePrompt(lang: PluginLanguage): string {
  return lang === 'en' ? DEFAULT_THEME_PROMPT_EN : DEFAULT_THEME_PROMPT_ZH;
}

/** 单个级别的默认生成内容：emoji / 主题 / 总结全开 */
export const DEFAULT_TITLE_LEVEL: TitleLevelConfig = {
  includeEmoji: true,
  includeTheme: true,
  includeSummary: true,
};

/** 生成一份默认标题配置（深拷贝，两个提示词随界面语言） */
export function createDefaultTitle(lang: PluginLanguage = DEFAULT_LANGUAGE): TitleSettings {
  return {
    languageMode: 'document',
    customLanguage: 'zh',
    generationPrompt: defaultGenerationPrompt(lang),
    themePrompt: defaultThemePrompt(lang),
    levels: {
      1: { ...DEFAULT_TITLE_LEVEL },
      2: { ...DEFAULT_TITLE_LEVEL },
      3: { ...DEFAULT_TITLE_LEVEL },
      4: { ...DEFAULT_TITLE_LEVEL },
    },
  };
}

/** LLM 设置：服务商 + API Key（持久化到 data.json） */
export interface LlmSettings {
  provider: LlmProviderId;
  apiKey: string;
}

/** 默认 LLM 设置：Claude，未填写 key */
export const DEFAULT_LLM: LlmSettings = {
  provider: 'claude',
  apiKey: '',
};

/** 生成一份全新的默认设置（深拷贝，避免多个实例共享同一对象） */
export function createDefaultSettings(): H1RenumberSettings {
  return {
    language: DEFAULT_LANGUAGE,
    numberingMode: DEFAULT_NUMBERING_MODE,
    spaceAfterDelimiter: DEFAULT_SPACE_AFTER_DELIMITER,
    levels: {
      1: { ...DEFAULT_LEVELS[1] },
      2: { ...DEFAULT_LEVELS[2] },
      3: { ...DEFAULT_LEVELS[3] },
      4: { ...DEFAULT_LEVELS[4] },
    },
    tidy: {
      codeBlockLanguage: DEFAULT_TIDY.codeBlockLanguage,
      collapseBlankLines: DEFAULT_TIDY.collapseBlankLines,
      padBlockquotes: DEFAULT_TIDY.padBlockquotes,
      separators: { ...DEFAULT_TIDY.separators },
    },
    insertBlankLines: DEFAULT_INSERT_BLANK_LINES,
    imageTidy: { ...DEFAULT_IMAGE_TIDY },
    title: createDefaultTitle(),
    llm: { ...DEFAULT_LLM },
  };
}

/** 旧的全局设置结构（仅用于迁移） */
interface LegacySettings {
  style?: unknown;
  delimiter?: unknown;
  addNumberToUnnumbered?: unknown;
}

function isPluginLanguage(value: unknown): value is PluginLanguage {
  return typeof value === 'string' && (PLUGIN_LANGUAGES as readonly string[]).includes(value);
}

function isNumberingMode(value: unknown): value is NumberingMode {
  return typeof value === 'string' && (NUMBERING_MODES as readonly string[]).includes(value);
}

function isNumberingStyle(value: unknown): value is NumberingStyle {
  return typeof value === 'string' && (NUMBERING_STYLES as readonly string[]).includes(value);
}

function isFillPolicy(value: unknown): value is FillPolicy {
  return typeof value === 'string' && (FILL_POLICIES as readonly string[]).includes(value);
}

function isLlmProviderId(value: unknown): value is LlmProviderId {
  return typeof value === 'string' && (LLM_PROVIDER_IDS as readonly string[]).includes(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isTitleLanguageMode(value: unknown): value is TitleLanguageMode {
  return typeof value === 'string' && (TITLE_LANGUAGE_MODES as readonly string[]).includes(value);
}

function isTitleLanguageId(value: unknown): value is TitleLanguageId {
  return typeof value === 'string' && (TITLE_LANGUAGE_IDS as readonly string[]).includes(value);
}

/**
 * 插入空白行数：取整并夹逼到 1..100；非法值回退默认。
 * 设置页与旧数据都走这里，避免写入 0 / 小数 / 超大值。
 */
export function clampInsertBlankLines(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < MIN_INSERT_BLANK_LINES) return MIN_INSERT_BLANK_LINES;
  if (rounded > MAX_INSERT_BLANK_LINES) return MAX_INSERT_BLANK_LINES;
  return rounded;
}

/**
 * 图片文件夹名：按 `/`、`\` 拆段，去掉 Windows 非法字符与 `.` / `..`。
 * 全空时回退默认名，避免把图片写进仓库根或空路径。
 */
export function sanitizeImageFolder(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const segments = value
    .split(/[\\/]+/)
    .map((segment) => segment.replace(/[<>:"|?*]/g, '').trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
  return segments.length > 0 ? segments.join('/') : fallback;
}

/** 解析单个层级的配置；兼容旧版 delimiter 单字符字段 */
function normalizeLevelConfig(
  entry: unknown,
  fallback: LevelConfig,
  level: HeadingLevel,
): LevelConfig {
  if (!entry || typeof entry !== 'object') return { ...fallback };
  const value = entry as Record<string, unknown>;

  const style = isNumberingStyle(value.style) ? value.style : fallback.style;

  let delimiterId = fallback.delimiterId;
  if (typeof value.delimiterId === 'string' && isDelimiterId(value.delimiterId)) {
    delimiterId = value.delimiterId;
  } else if (typeof value.delimiter === 'string') {
    // v0.0.2 及更早：delimiter 是单字符
    delimiterId = delimiterIdFromLegacyChar(value.delimiter) ?? delimiterId;
  }
  if (!isDelimiterId(delimiterId)) delimiterId = fallback.delimiterId;

  let fillPolicy = isFillPolicy(value.fillPolicy) ? value.fillPolicy : fallback.fillPolicy;

  // v0.0.8：旧数据里 H3/H4 可能仍保存着 v0.0.5 的默认 consistent。
  // 补号策略未开放 UI，按现行默认升级为 always，避免无编号 H3/H4 不补号。
  if (level >= 3 && fillPolicy === 'consistent') fillPolicy = 'always';

  return { style, delimiterId, fillPolicy };
}

/** 标题级别的三开关；缺失或非法字段回退默认 */
function normalizeTitleLevelConfig(entry: unknown, fallback: TitleLevelConfig): TitleLevelConfig {
  if (!entry || typeof entry !== 'object') return { ...fallback };
  const value = entry as Record<string, unknown>;
  return {
    includeEmoji: isBoolean(value.includeEmoji) ? value.includeEmoji : fallback.includeEmoji,
    includeTheme: isBoolean(value.includeTheme) ? value.includeTheme : fallback.includeTheme,
    includeSummary: isBoolean(value.includeSummary) ? value.includeSummary : fallback.includeSummary,
  };
}

/**
 * 归一化标题生成配置。
 * - 缺失/非法字段回退默认；
 * - generationPrompt / themePrompt 缺失（或非字符串）时按当前界面语言回填默认；
 *   已保存的空串保留，由 buildPrompt 在生成时按当前语言回退（支持「清空」语义）。
 */
function normalizeTitleSettings(entry: unknown, lang: PluginLanguage): TitleSettings {
  const settings = createDefaultTitle(lang);
  if (!entry || typeof entry !== 'object') return settings;

  const value = entry as Record<string, unknown>;
  if (isTitleLanguageMode(value.languageMode)) settings.languageMode = value.languageMode;
  if (isTitleLanguageId(value.customLanguage)) settings.customLanguage = value.customLanguage;
  if (typeof value.generationPrompt === 'string') {
    settings.generationPrompt = migrateGenerationPrompt(value.generationPrompt);
  }
  if (typeof value.themePrompt === 'string') {
    settings.themePrompt = migrateThemePrompt(value.themePrompt);
  }

  if (value.levels && typeof value.levels === 'object') {
    const levels = value.levels as Record<string, unknown>;
    for (const level of HEADING_LEVELS) {
      settings.levels[level] = normalizeTitleLevelConfig(
        levels[String(level)],
        settings.levels[level],
      );
    }
  }

  return settings;
}

/** 图片自动整理配置：缺失或非法字段回退默认 */
function normalizeImageTidy(entry: unknown, fallback: ImageTidySettings): ImageTidySettings {
  if (!entry || typeof entry !== 'object') return { ...fallback };
  const value = entry as Record<string, unknown>;
  return {
    enabled: isBoolean(value.enabled) ? value.enabled : fallback.enabled,
    folder: sanitizeImageFolder(value.folder, fallback.folder),
  };
}

/**
 * 把已保存的数据归一化为当前设置结构。
 * - 新结构：逐级合并，缺失或非法字段回退默认值
 * - 旧结构（全局 style/delimiter/addNumberToUnnumbered）：迁移到 H1
 * - 旧版逐级 delimiter（单字符）：迁移为 delimiterId
 */
export function normalizeSettings(raw: unknown): H1RenumberSettings {
  const settings = createDefaultSettings();
  if (!raw || typeof raw !== 'object') return settings;

  const record = raw as Record<string, unknown>;

  if (isPluginLanguage(record.language)) settings.language = record.language;
  if (isNumberingMode(record.numberingMode)) settings.numberingMode = record.numberingMode;
  if (isBoolean(record.spaceAfterDelimiter)) settings.spaceAfterDelimiter = record.spaceAfterDelimiter;
  settings.insertBlankLines = clampInsertBlankLines(
    record.insertBlankLines,
    settings.insertBlankLines,
  );
  settings.imageTidy = normalizeImageTidy(record.imageTidy, settings.imageTidy);
  settings.title = normalizeTitleSettings(record.title, settings.language);

  if (record.llm && typeof record.llm === 'object') {
    const llm = record.llm as Record<string, unknown>;
    if (isLlmProviderId(llm.provider)) settings.llm.provider = llm.provider;
    if (typeof llm.apiKey === 'string') settings.llm.apiKey = llm.apiKey;
  }

  if (
    !('levels' in record) &&
    ('style' in record || 'delimiter' in record || 'addNumberToUnnumbered' in record)
  ) {
    const legacy = record as LegacySettings;
    settings.levels[1] = {
      style: isNumberingStyle(legacy.style) ? legacy.style : settings.levels[1].style,
      delimiterId:
        typeof legacy.delimiter === 'string'
          ? delimiterIdFromLegacyChar(legacy.delimiter) ?? settings.levels[1].delimiterId
          : settings.levels[1].delimiterId,
      fillPolicy: legacy.addNumberToUnnumbered === false ? 'never' : 'always',
    };
    return settings;
  }

  if (record.levels && typeof record.levels === 'object') {
    const levels = record.levels as Record<string, unknown>;
    for (const level of HEADING_LEVELS) {
      settings.levels[level] = normalizeLevelConfig(
        levels[String(level)],
        settings.levels[level],
        level,
      );
    }
  }

  if (record.tidy && typeof record.tidy === 'object') {
    const tidy = record.tidy as Record<string, unknown>;
    settings.tidy.codeBlockLanguage = isBoolean(tidy.codeBlockLanguage)
      ? tidy.codeBlockLanguage
      : settings.tidy.codeBlockLanguage;
    settings.tidy.collapseBlankLines = isBoolean(tidy.collapseBlankLines)
      ? tidy.collapseBlankLines
      : settings.tidy.collapseBlankLines;
    settings.tidy.padBlockquotes = isBoolean(tidy.padBlockquotes)
      ? tidy.padBlockquotes
      : settings.tidy.padBlockquotes;

    if (tidy.separators && typeof tidy.separators === 'object') {
      const separators = tidy.separators as Record<string, unknown>;
      settings.tidy.separators.removeExisting = isBoolean(separators.removeExisting)
        ? separators.removeExisting
        : settings.tidy.separators.removeExisting;
      settings.tidy.separators.insertBetweenH1 = isBoolean(separators.insertBetweenH1)
        ? separators.insertBetweenH1
        : settings.tidy.separators.insertBetweenH1;
      settings.tidy.separators.insertBetweenH2 = isBoolean(separators.insertBetweenH2)
        ? separators.insertBetweenH2
        : settings.tidy.separators.insertBetweenH2;
    }
  }

  return settings;
}