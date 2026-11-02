import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  applyTitles,
  buildPrompt,
  extractDocumentOutline,
} from '../src/core/titleRegenerator.ts';
import { createDefaultSettings } from '../src/types.ts';
import type { H1RenumberSettings } from '../src/types.ts';

/** 英文界面 + 默认标题设置（默认标题语言为「跟随文档」） */
function englishSettings(): H1RenumberSettings {
  const settings = createDefaultSettings();
  settings.language = 'en';
  return settings;
}

const ENGLISH_DOC = [
  '# Introduction',
  '',
  'This plugin renumbers headings in document order and skips code blocks.',
  'It also regenerates the headings from the body text of each section.',
].join('\n');

const CHINESE_DOC = [
  '# 介绍',
  '',
  '这个插件按文档顺序重新编号标题，并跳过代码块。',
  '它还会根据每节正文重新生成标题。',
].join('\n');

test('英文界面 + 英文正文：prompt 要求用英文生成标题', () => {
  const settings = englishSettings();
  const prompt = buildPrompt(extractDocumentOutline(ENGLISH_DOC), settings);

  assert.match(prompt, /Write theme and summary in English/);
  assert.doesNotMatch(prompt, /Write theme and summary in Chinese/);
  // 存的还是中文默认提示词时，英文界面要按英文默认生效，避免「不超过 20 个字」把结果带成中文
  assert.match(prompt, /Draw on the naming logic of classes and objects/);
});

test('英文界面 + 中文正文：仍按正文语言要求中文标题', () => {
  const settings = englishSettings();
  const prompt = buildPrompt(extractDocumentOutline(CHINESE_DOC), settings);

  assert.match(prompt, /Write theme and summary in Chinese/);
});

test('中文界面 + 英文正文：prompt 明确要求英文标题', () => {
  const settings = createDefaultSettings();
  settings.language = 'zh';
  const prompt = buildPrompt(extractDocumentOutline(ENGLISH_DOC), settings);

  assert.match(prompt, /使用英文（English）输出 theme 与 summary/);
});

test('指定语言模式优先使用所选语言', () => {
  const settings = englishSettings();
  settings.title.languageMode = 'custom';
  settings.title.customLanguage = 'ja';
  const prompt = buildPrompt(extractDocumentOutline(ENGLISH_DOC), settings);

  assert.match(prompt, /Write theme and summary in Japanese/);
});

test('主题长度建议随输出语言换单位，不给英文正文套「个汉字」', () => {
  const zhSettings = createDefaultSettings();
  zhSettings.language = 'zh';
  const zhPromptForEnglishDoc = buildPrompt(extractDocumentOutline(ENGLISH_DOC), zhSettings);
  assert.match(zhPromptForEnglishDoc, /尽量不超过 7 个单词/);
  assert.doesNotMatch(zhPromptForEnglishDoc, /7 个汉字/);

  const enPromptForChineseDoc = buildPrompt(
    extractDocumentOutline(CHINESE_DOC),
    englishSettings(),
  );
  assert.match(enPromptForChineseDoc, /ideally no more than 7 characters/);

  const enPromptForEnglishDoc = buildPrompt(extractDocumentOutline(ENGLISH_DOC), englishSettings());
  assert.match(enPromptForEnglishDoc, /ideally no more than 7 words/);
});

test('英文标题用冒号 + 空格拼接主题与总结', () => {
  const settings = englishSettings();
  const outline = extractDocumentOutline(ENGLISH_DOC);
  const result = applyTitles(
    ENGLISH_DOC,
    outline,
    [{ emoji: '🚀', theme: 'Introduction', summary: 'Renumbers headings in order' }],
    settings.title,
  );

  assert.equal(result.changedCount, 1);
  assert.equal(
    result.text.split('\n')[0],
    '# 🚀 Introduction: Renumbers headings in order',
  );
});

test('中文标题仍用全角冒号拼接', () => {
  const settings = createDefaultSettings();
  const outline = extractDocumentOutline(CHINESE_DOC);
  const result = applyTitles(
    CHINESE_DOC,
    outline,
    [{ emoji: '🚀', theme: '介绍', summary: '按顺序重排标题' }],
    settings.title,
  );

  assert.equal(result.text.split('\n')[0], '# 🚀 介绍：按顺序重排标题');
});
