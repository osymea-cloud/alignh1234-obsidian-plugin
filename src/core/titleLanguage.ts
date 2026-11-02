import { TITLE_LANGUAGE_IDS } from '../types.ts';
import type { PluginLanguage, TitleLanguageId } from '../types.ts';

/** 一种可选标题语言：id + 中英文名 + 注入 prompt 的语言名 */
export interface TitleLanguage {
  id: TitleLanguageId;
  /** 设置页中文名 */
  nameZh: string;
  /** 设置页英文名 */
  nameEn: string;
  /** 注入 prompt 的英文名（LLM 识别更稳定） */
  promptName: string;
}

const DEFAULT_TITLE_LANGUAGE: TitleLanguage = {
  id: 'zh',
  nameZh: '中文',
  nameEn: 'Chinese',
  promptName: 'Chinese',
};

/** 11 种主要语言注册表（顺序与 TITLE_LANGUAGE_IDS 一致） */
export const TITLE_LANGUAGES: readonly TitleLanguage[] = [
  DEFAULT_TITLE_LANGUAGE,
  { id: 'en', nameZh: '英文', nameEn: 'English', promptName: 'English' },
  { id: 'ja', nameZh: '日文', nameEn: 'Japanese', promptName: 'Japanese' },
  { id: 'ko', nameZh: '韩文', nameEn: 'Korean', promptName: 'Korean' },
  { id: 'es', nameZh: '西班牙语', nameEn: 'Spanish', promptName: 'Spanish' },
  { id: 'fr', nameZh: '法语', nameEn: 'French', promptName: 'French' },
  { id: 'de', nameZh: '德语', nameEn: 'German', promptName: 'German' },
  { id: 'pt', nameZh: '葡萄牙语', nameEn: 'Portuguese', promptName: 'Portuguese' },
  { id: 'ru', nameZh: '俄语', nameEn: 'Russian', promptName: 'Russian' },
  { id: 'it', nameZh: '意大利语', nameEn: 'Italian', promptName: 'Italian' },
  { id: 'ar', nameZh: '阿拉伯语', nameEn: 'Arabic', promptName: 'Arabic' },
];

/** 运行时校验：是否为受支持的标题语言 id */
export function isTitleLanguageId(value: unknown): value is TitleLanguageId {
  return typeof value === 'string' && (TITLE_LANGUAGE_IDS as readonly string[]).includes(value);
}

/** 按 id 取语言；非法 id 回退中文 */
export function getTitleLanguage(id: TitleLanguageId): TitleLanguage {
  return TITLE_LANGUAGES.find((language) => language.id === id) ?? DEFAULT_TITLE_LANGUAGE;
}

/** 设置页展示名：中文界面用中文名，英文界面用英文名 */
export function titleLanguageLabel(id: TitleLanguageId, lang: PluginLanguage): string {
  const language = getTitleLanguage(id);
  return lang === 'en' ? language.nameEn : language.nameZh;
}

/** 注入 prompt 的语言名 */
export function titleLanguagePromptName(id: TitleLanguageId): string {
  return getTitleLanguage(id).promptName;
}
