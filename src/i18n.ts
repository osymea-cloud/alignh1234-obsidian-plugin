import type { LlmProviderId, NumberingStyle, PluginLanguage } from './types.ts';

export type TranslationKey =
  | 'command.organize'
  | 'command.insertBlankLines'
  | 'notice.noChange'
  | 'notice.organized'
  | 'notice.formatUpdated'
  | 'notice.renumbered'
  | 'notice.languageAdded'
  | 'notice.blankLinesCollapsed'
  | 'notice.separatorsRemoved'
  | 'notice.separatorsInserted'
  | 'notice.blockquotePadded'
  | 'notice.imagesMoved'
  | 'notice.imageFolderCreated'
  | 'notice.imageTidyFailed'
  | 'setting.language.name'
  | 'setting.language.desc'
  | 'setting.language.zh'
  | 'setting.language.en'
  | 'setting.numberingMode.name'
  | 'setting.numberingMode.desc'
  | 'setting.numberingMode.single'
  | 'setting.numberingMode.multi'
  | 'setting.numberingMode.multiHint'
  | 'setting.spaceAfterDelimiter.name'
  | 'setting.spaceAfterDelimiter.desc'
  | 'setting.level.heading'
  | 'setting.level.styleName'
  | 'setting.level.styleDesc'
  | 'setting.level.delimiterName'
  | 'setting.level.delimiterDesc'
  | 'setting.tidy.heading'
  | 'setting.tidy.codeBlockLanguage.name'
  | 'setting.tidy.codeBlockLanguage.desc'
  | 'setting.tidy.collapseBlankLines.name'
  | 'setting.tidy.collapseBlankLines.desc'
  | 'setting.tidy.separators.heading'
  | 'setting.tidy.separators.removeExisting.name'
  | 'setting.tidy.separators.removeExisting.desc'
  | 'setting.tidy.separators.insertBetweenH1.name'
  | 'setting.tidy.separators.insertBetweenH1.desc'
  | 'setting.tidy.separators.insertBetweenH2.name'
  | 'setting.tidy.separators.insertBetweenH2.desc'
  | 'setting.tidy.padBlockquotes.name'
  | 'setting.tidy.padBlockquotes.desc'
  | 'setting.insertBlankLines.name'
  | 'setting.insertBlankLines.desc'
  | 'setting.imageTidy.heading'
  | 'setting.imageTidy.enabled.name'
  | 'setting.imageTidy.enabled.desc'
  | 'setting.imageTidy.folder.name'
  | 'setting.imageTidy.folder.desc'
  | 'setting.imageTidy.folder.placeholder'
  | 'command.regenerateTitles'
  | 'notice.noHeadings'
  | 'notice.noParagraph'
  | 'notice.blankLinesInserted'
  | 'notice.regeneratedAndOrganized'
  | 'notice.noApiKey'
  | 'notice.unknownProvider'
  | 'notice.generating'
  | 'notice.titlesRegenerated'
  | 'notice.titlesUnchanged'
  | 'notice.llmError'
  | 'confirm.regenerate.message'
  | 'confirm.regenerate.confirm'
  | 'confirm.cancel'
  | 'setting.title.heading'
  | 'setting.title.languageMode.name'
  | 'setting.title.languageMode.desc'
  | 'setting.title.languageMode.document'
  | 'setting.title.languageMode.custom'
  | 'setting.title.customLanguage.name'
  | 'setting.title.customLanguage.desc'
  | 'setting.title.level.heading'
  | 'setting.title.level.desc'
  | 'setting.title.level.invalid'
  | 'setting.title.level.emoji'
  | 'setting.title.level.emoji.desc'
  | 'setting.title.level.theme'
  | 'setting.title.level.theme.desc'
  | 'setting.title.level.summary'
  | 'setting.title.level.summary.desc'
  | 'setting.title.prompt.name'
  | 'setting.title.prompt.desc'
  | 'setting.title.prompt.edit'
  | 'setting.title.prompt.reset'
  | 'setting.title.prompt.modalTitle'
  | 'setting.title.prompt.save'
  | 'setting.title.prompt.emptyHint'
  | 'setting.title.themePrompt.name'
  | 'setting.title.themePrompt.desc'
  | 'setting.title.themePrompt.modalTitle'
  | 'setting.title.themePrompt.emptyHint'
  | 'notice.invalidTitleSettings'
  | 'setting.llm.heading'
  | 'setting.llm.provider.name'
  | 'setting.llm.provider.desc'
  | 'setting.llm.apiKey.name'
  | 'setting.llm.apiKey.desc'
  | 'setting.llm.apiKey.placeholder'
  | 'setting.llm.clearApiKey'
  | 'setting.llm.securityHint'
  | 'llm.provider.claude'
  | 'llm.provider.deepseek'
  | 'llm.provider.gemini'
  | 'llm.provider.gpt'
  | 'llm.provider.qwen'
  | 'llm.provider.kimi'
  | 'delimiter.none'
  | 'delimiter.space'
  | 'style.chinese'
  | 'style.arabic'
  | 'style.roman-upper'
  | 'style.roman-lower'
  | 'style.latin-upper'
  | 'style.latin-lower'
  | 'style.circled'
  | 'style.circled-hangul'
  | 'style.hangul'
  | 'style.cyrillic'
  | 'style.katakana'
  | 'style.eastern-arabic'
  | 'style.none';

interface TranslationEntry {
  zh: string;
  en: string;
}

const DICT: Record<TranslationKey, TranslationEntry> = {
  'command.organize': { zh: '整理当前文档', en: 'Organize current document' },
  'command.insertBlankLines': { zh: '在本段后插入空白行', en: 'Insert blank lines after this paragraph' },
  'notice.noChange': { zh: '当前文档无需整理', en: 'Nothing to organize in this document' },
  'notice.organized': { zh: '已整理当前文档：{parts}', en: 'Document organized: {parts}' },
  'notice.formatUpdated': { zh: '格式已更新', en: 'format updated' },
  'notice.renumbered': { zh: '重编号 {count} 个标题', en: 'renumbered {count} heading(s)' },
  'notice.languageAdded': { zh: '补全 {count} 个代码块语言', en: 'added language to {count} code block(s)' },
  'notice.blankLinesCollapsed': { zh: '合并 {count} 处空行', en: 'collapsed {count} blank line group(s)' },
  'notice.separatorsRemoved': { zh: '删除 {count} 条分割线', en: 'removed {count} separator(s)' },
  'notice.separatorsInserted': { zh: '插入 {count} 条分割线', en: 'inserted {count} separator(s)' },
  'notice.blockquotePadded': { zh: '块引用首尾补 {count} 行空 >', en: 'padded {count} block quote line(s)' },
  'notice.imagesMoved': {
    zh: '已归档 {count} 张图片到 {folder}',
    en: 'moved {count} image(s) to {folder}',
  },
  'notice.imageFolderCreated': {
    zh: '已新建图片文件夹：{folder}',
    en: 'Created image folder: {folder}',
  },
  'notice.imageTidyFailed': {
    zh: '整理图片位置失败：{message}',
    en: 'Failed to tidy image location: {message}',
  },
  'setting.language.name': { zh: '界面语言', en: 'Language' },
  'setting.language.desc': {
    zh: '仅影响设置页与命令/提示文案；设置页立即生效，命令名需重载插件后更新',
    en: 'Affects the settings UI, command and notices; the settings page updates immediately, the command name after reloading the plugin',
  },
  'setting.language.zh': { zh: '中文', en: '中文' },
  'setting.language.en': { zh: 'English', en: 'English' },
  'setting.numberingMode.name': { zh: '编号模式', en: 'Numbering mode' },
  'setting.numberingMode.desc': {
    zh: '单级：每级独立编号（如 一、 / 1.）；多级：科研多级编号（1 / 1.1 / 1.1.1 / 1.1.1.1）',
    en: 'Single-level: independent numbering per level (e.g. I. / 1.); Multi-level: hierarchical numbering (1 / 1.1 / 1.1.1 / 1.1.1.1)',
  },
  'setting.numberingMode.single': { zh: '单级编号', en: 'Single-level' },
  'setting.numberingMode.multi': { zh: '多级编号', en: 'Multi-level' },
  'setting.numberingMode.multiHint': {
    zh: '多级编号固定为「阿拉伯数字 + 点 + 空格」，下方各级的风格/分隔符设置不生效；缺父级时按 1 兜底',
    en: 'Multi-level numbering is fixed to "Arabic number + dot + space"; the per-level style/delimiter settings below are ignored; missing parents fall back to 1',
  },
  'setting.spaceAfterDelimiter.name': { zh: '分隔符后补空格', en: 'Space after delimiter' },
  'setting.spaceAfterDelimiter.desc': {
    zh: '单级编号生成时在分隔符后加一个空格（如「一、 概述」）；「空格」分隔符与「清除编号」不受影响，多级编号本来就带空格',
    en: 'Add one space after the delimiter in single-level mode (e.g. "I. Overview"); the space delimiter and "remove numbering" are unaffected, multi-level numbering already has a space',
  },
  'setting.level.heading': { zh: 'H{level} 标题', en: 'H{level} headings' },
  'setting.level.styleName': { zh: '编号风格', en: 'Numbering style' },
  'setting.level.styleDesc': {
    zh: '重写 H{level} 标题时使用的编号体系',
    en: 'Numbering system used when rewriting H{level} headings',
  },
  'setting.level.delimiterName': { zh: '分隔符', en: 'Delimiter' },
  'setting.level.delimiterDesc': {
    zh: '编号与标题正文之间的分隔符（识别旧编号时兼容全部字符分隔符）',
    en: 'Delimiter between the number and the heading text (all character delimiters are recognized)',
  },
  'setting.tidy.heading': { zh: '整理选项', en: 'Tidy options' },
  'setting.tidy.codeBlockLanguage.name': { zh: '补全代码块语言', en: 'Add code block language' },
  'setting.tidy.codeBlockLanguage.desc': {
    zh: '给缺少语言的围栏代码块自动补上 json / yaml / python / bash / sql / html / cpp / c；识别不了就不加',
    en: 'Add json / yaml / python / bash / sql / html / cpp / c to fenced code blocks without a language when detectable',
  },
  'setting.tidy.collapseBlankLines.name': { zh: '合并空行', en: 'Collapse blank lines' },
  'setting.tidy.collapseBlankLines.desc': {
    zh: '把连续 3+ 个换行合并成 1 个空行；frontmatter 与代码块内不处理',
    en: 'Collapse 3+ consecutive newlines into a single blank line; frontmatter and code blocks are untouched',
  },
  'setting.tidy.separators.heading': { zh: '分割线', en: 'Separators' },
  'setting.tidy.separators.removeExisting.name': { zh: '删除现有分割线', en: 'Remove existing separators' },
  'setting.tidy.separators.removeExisting.desc': {
    zh: '删除 - / * / _ 三种字符组成的分割线；frontmatter 与 setext 下划线不受影响',
    en: 'Remove separators made of - / * / _; frontmatter and setext underlines are untouched',
  },
  'setting.tidy.separators.insertBetweenH1.name': { zh: '两个一级标题之间插入', en: 'Insert between H1 headings' },
  'setting.tidy.separators.insertBetweenH1.desc': {
    zh: '在每个非首个 H1 之前插入一条 ---',
    en: 'Insert --- before every H1 except the first',
  },
  'setting.tidy.separators.insertBetweenH2.name': { zh: '两个二级标题之间插入', en: 'Insert between H2 headings' },
  'setting.tidy.separators.insertBetweenH2.desc': {
    zh: '在每个 H1 分组内、该组非首个 H2 之前插入一条 ---；无 H1 时按全文非首个 H2 处理',
    en: 'Insert --- before every H2 except the first in each H1 group; without H1, treat the whole document as one group',
  },
  'setting.tidy.padBlockquotes.name': { zh: '块引用首尾补空行', en: 'Pad block quotes' },
  'setting.tidy.padBlockquotes.desc': {
    zh: '在每个 > 块引用的首尾各补一行空 >，保证引用块与上下文隔开；frontmatter 与代码块内不处理，已有空 > 不重复添加',
    en: 'Add an empty > line before and after every > block quote; frontmatter and code blocks are untouched, existing empty > lines are not duplicated',
  },
  'setting.insertBlankLines.name': { zh: '插入空白行数', en: 'Blank lines to insert' },
  'setting.insertBlankLines.desc': {
    zh: '命令「在本段后插入空白行」一次插入的空白行数（1-100）',
    en: 'How many blank lines the "Insert blank lines after this paragraph" command inserts (1-100)',
  },
  'setting.imageTidy.heading': { zh: '自动整理插入图片', en: 'Auto-organize inserted images' },
  'setting.imageTidy.enabled.name': { zh: '启用', en: 'Enable' },
  'setting.imageTidy.enabled.desc': {
    zh: '笔记内容保存时，把本页新增的图片嵌入移动到下方文件夹，并改写链接（原图删除，移动而非复制）',
    en: 'When a note is saved, move images newly embedded in that note into the folder below and rewrite the links (the original file is deleted, not copied)',
  },
  'setting.imageTidy.folder.name': { zh: '图片文件夹', en: 'Image folder' },
  'setting.imageTidy.folder.desc': {
    zh: '相对笔记所在目录；不存在时自动新建。只处理本页新出现的图片，已在文件夹内的跳过',
    en: 'Relative to the note folder; created when missing. Only images newly embedded in this note are handled, ones already in the folder are skipped',
  },
  'setting.imageTidy.folder.placeholder': { zh: 'picture', en: 'picture' },
  'command.regenerateTitles': { zh: '重新生成标题（AI）', en: 'Regenerate headings (AI)' },
  'notice.noHeadings': {
    zh: '当前文档没有可重新生成的标题',
    en: 'No headings to regenerate in this document',
  },
  'notice.noParagraph': {
    zh: '光标处没有可识别的段落（请把光标放在正文段落内）',
    en: 'No paragraph at the cursor (place the cursor inside a body paragraph)',
  },
  'notice.blankLinesInserted': { zh: '已在本段后插入 {count} 个空白行', en: 'Inserted {count} blank line(s) after this paragraph' },
  'notice.regeneratedAndOrganized': {
    zh: '已重新生成标题并整理文档：{parts}',
    en: 'Headings regenerated and document organized: {parts}',
  },
  'notice.noApiKey': {
    zh: '请先在设置中填写 AI 服务商的 API Key',
    en: 'Set the API key for the AI provider in settings first',
  },
  'notice.unknownProvider': { zh: '未知的 AI 服务商', en: 'Unknown AI provider' },
  'notice.generating': {
    zh: '正在请求 AI 重新生成 {count} 个标题…',
    en: 'Regenerating {count} heading(s) with AI…',
  },
  'notice.titlesRegenerated': {
    zh: '已重新生成 {count} 个标题',
    en: 'Regenerated {count} heading(s)',
  },
  'notice.titlesUnchanged': {
    zh: 'AI 返回的标题与现有标题一致',
    en: 'The AI returned the same headings',
  },
  'notice.llmError': { zh: 'AI 请求失败：{message}', en: 'AI request failed: {message}' },
  'confirm.regenerate.message': {
    zh: '将调用 AI 为当前文档的 {count} 个标题重新生成内容（按各级设置），正文不会改动。是否继续？',
    en: 'This will call the AI to regenerate {count} heading(s) according to the per-level settings. Body text will not change. Continue?',
  },
  'confirm.regenerate.confirm': { zh: '继续生成', en: 'Regenerate' },
  'confirm.cancel': { zh: '取消', en: 'Cancel' },
  'setting.title.heading': { zh: 'AI 标题内容', en: 'AI heading content' },
  'setting.title.languageMode.name': { zh: '标题语言', en: 'Heading language' },
  'setting.title.languageMode.desc': {
    zh: '跟随文档：由 AI 判断正文主要语言；指定语言：固定使用下方选择的语言。与界面语言无关。',
    en: 'Follow document: the AI infers the main language of the body. Custom: always use the language selected below. Independent of the UI language.',
  },
  'setting.title.languageMode.document': { zh: '跟随文档', en: 'Follow document' },
  'setting.title.languageMode.custom': { zh: '指定语言', en: 'Custom language' },
  'setting.title.customLanguage.name': { zh: '指定语言', en: 'Language' },
  'setting.title.customLanguage.desc': {
    zh: '仅「指定语言」模式生效，共 11 种',
    en: 'Only applies in custom mode; 11 languages available',
  },
  'setting.title.level.heading': { zh: 'H{level} 生成内容', en: 'H{level} content' },
  'setting.title.level.desc': {
    zh: '三项至少开启一项；全部关闭时命令会报错并中止',
    en: 'Enable at least one field; the command aborts with an error when all are off',
  },
  'setting.title.level.invalid': {
    zh: 'H{level} 三项全部关闭：请至少开启一项',
    en: 'H{level} has all fields off: enable at least one',
  },
  'setting.title.level.emoji': { zh: '生成 emoji', en: 'Generate emoji' },
  'setting.title.level.emoji.desc': {
    zh: '用 AI 生成的 emoji 替换原标题开头的 emoji',
    en: 'Replace the existing leading emoji with an AI-generated one',
  },
  'setting.title.level.theme': { zh: '讨论主题', en: 'Discussion topic' },
  'setting.title.level.theme.desc': {
    zh: '不超过 7 字的主题词（英文为短词组）',
    en: 'Short topic phrase (about 7 words or fewer)',
  },
  'setting.title.level.summary': { zh: '一句话总结', en: 'One-sentence summary' },
  'setting.title.level.summary.desc': {
    zh: '与主题以「：」相连；主题关闭时不加冒号',
    en: 'Joined to the topic with a colon; no colon when the topic is off',
  },
  'setting.title.prompt.name': { zh: '标题生成提示词', en: 'Heading generation prompt' },
  'setting.title.prompt.desc': {
    zh: '对「一句话总结」的生成要求；清空后按界面语言回退默认文案',
    en: 'Requirements for the one-sentence summary; when empty, the default for the UI language is used',
  },
  'setting.title.prompt.edit': { zh: '修改', en: 'Edit' },
  'setting.title.prompt.reset': { zh: '初始化', en: 'Reset' },
  'setting.title.prompt.modalTitle': {
    zh: '修改标题生成提示词',
    en: 'Edit heading generation prompt',
  },
  'setting.title.prompt.save': { zh: '保存', en: 'Save' },
  'setting.title.prompt.emptyHint': {
    zh: '当前为空：生成时将按界面语言回退默认文案（上方为回退后的预览）',
    en: 'Empty: the default for the UI language will be used at generation time (the preview above shows the fallback)',
  },
  'setting.title.themePrompt.name': { zh: '主题生成提示词', en: 'Theme generation prompt' },
  'setting.title.themePrompt.desc': {
    zh: '对「讨论主题」的生成要求；清空后按界面语言回退默认文案',
    en: 'Requirements for the discussion topic; when empty, the default for the UI language is used',
  },
  'setting.title.themePrompt.modalTitle': {
    zh: '修改主题生成提示词',
    en: 'Edit theme generation prompt',
  },
  'setting.title.themePrompt.emptyHint': {
    zh: '当前为空：生成时将按界面语言回退默认文案（上方为回退后的预览）',
    en: 'Empty: the default for the UI language will be used at generation time (the preview above shows the fallback)',
  },
  'notice.invalidTitleSettings': {
    zh: '标题设置错误：{levels} 的 emoji / 讨论主题 / 一句话总结至少开启一项',
    en: 'Invalid heading settings: enable at least one of emoji / topic / summary for {levels}',
  },
  'setting.llm.heading': { zh: 'AI 服务商', en: 'AI provider' },
  'setting.llm.provider.name': { zh: '服务商', en: 'Provider' },
  'setting.llm.provider.desc': {
    zh: '选择用于「重新生成标题」的 AI 服务商',
    en: 'AI provider used by "Regenerate headings"',
  },
  'setting.llm.apiKey.name': { zh: 'API Key', en: 'API key' },
  'setting.llm.apiKey.desc': {
    zh: '保存在插件数据文件 data.json 中；仅用于向所选服务商发送标题生成请求',
    en: 'Stored in the plugin data file (data.json); used only to send heading-generation requests to the selected provider',
  },
  'setting.llm.apiKey.placeholder': { zh: '粘贴 API Key', en: 'Paste API key' },
  'setting.llm.clearApiKey': { zh: '清除', en: 'Clear' },
  'setting.llm.securityHint': {
    zh: '提示：API Key 以明文保存在 data.json，请勿在共享仓库中提交该文件。',
    en: 'Note: the API key is stored as plain text in data.json; do not commit that file to a shared repository.',
  },
  'llm.provider.claude': { zh: 'Claude（Anthropic）', en: 'Claude (Anthropic)' },
  'llm.provider.deepseek': { zh: 'DeepSeek', en: 'DeepSeek' },
  'llm.provider.gemini': { zh: 'Gemini（Google）', en: 'Gemini (Google)' },
  'llm.provider.gpt': { zh: 'GPT（OpenAI）', en: 'GPT (OpenAI)' },
  'llm.provider.qwen': { zh: '通义千问（Qwen）', en: 'Qwen' },
  'llm.provider.kimi': { zh: 'Kimi（Moonshot）', en: 'Kimi (Moonshot)' },
  'delimiter.none': { zh: '无分隔符', en: 'No delimiter' },
  'delimiter.space': { zh: '空格', en: 'Space' },
  'style.chinese': { zh: '中文数字（一、二、三）', en: 'Chinese numerals (一, 二, 三)' },
  'style.arabic': { zh: '阿拉伯数字（1、2、3）', en: 'Arabic numerals (1, 2, 3)' },
  'style.roman-upper': { zh: '罗马数字·大写（I、II、III）', en: 'Roman numerals, upper (I, II, III)' },
  'style.roman-lower': { zh: '罗马数字·小写（i、ii、iii）', en: 'Roman numerals, lower (i, ii, iii)' },
  'style.latin-upper': { zh: '拉丁字母·大写（A、B、C）', en: 'Latin letters, upper (A, B, C)' },
  'style.latin-lower': { zh: '拉丁字母·小写（a、b、c）', en: 'Latin letters, lower (a, b, c)' },
  'style.circled': { zh: '圈号（①、②、③）', en: 'Circled numbers (①, ②, ③)' },
  'style.circled-hangul': { zh: '带圈韩文（㉮、㉯、㉰）', en: 'Circled Hangul (㉮, ㉯, ㉰)' },
  'style.hangul': { zh: '韩文字母（가、나、다）', en: 'Hangul (가, 나, 다)' },
  'style.cyrillic': { zh: '西里尔字母（а、б、в）', en: 'Cyrillic (а, б, в)' },
  'style.katakana': { zh: '片假名·伊吕波顺（イ、ロ、ハ）', en: 'Katakana, iroha order (イ, ロ, ハ)' },
  'style.eastern-arabic': { zh: '东阿拉伯数字（١、٢、٣）', en: 'Eastern Arabic numerals (١, ٢, ٣)' },
  'style.none': { zh: '清除编号', en: 'Remove numbering' },
};

/** 编号风格 → 文案 key（避免模板字符串丢失类型） */
export const STYLE_LABEL_KEYS: Record<NumberingStyle, TranslationKey> = {
  chinese: 'style.chinese',
  arabic: 'style.arabic',
  'roman-upper': 'style.roman-upper',
  'roman-lower': 'style.roman-lower',
  'latin-upper': 'style.latin-upper',
  'latin-lower': 'style.latin-lower',
  circled: 'style.circled',
  'circled-hangul': 'style.circled-hangul',
  hangul: 'style.hangul',
  cyrillic: 'style.cyrillic',
  katakana: 'style.katakana',
  'eastern-arabic': 'style.eastern-arabic',
  none: 'style.none',
};

/** AI 服务商 → 文案 key */
export const PROVIDER_LABEL_KEYS: Record<LlmProviderId, TranslationKey> = {
  claude: 'llm.provider.claude',
  deepseek: 'llm.provider.deepseek',
  gemini: 'llm.provider.gemini',
  gpt: 'llm.provider.gpt',
  qwen: 'llm.provider.qwen',
  kimi: 'llm.provider.kimi',
};

/**
 * 取当前语言的文案，并把 {name} 占位符替换为参数值。
 * 缺失的参数会原样保留，便于测试时发现漏传。
 */
export function t(
  key: TranslationKey,
  lang: PluginLanguage,
  params?: Readonly<Record<string, string | number>>,
): string {
  const entry = DICT[key];
  let text = lang === 'en' ? entry.en : entry.zh;
  if (!params) return text;
  for (const [name, value] of Object.entries(params)) {
    text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}