import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  DEFAULT_GENERATION_PROMPT_EN,
  DEFAULT_GENERATION_PROMPT_ZH,
  DEFAULT_THEME_PROMPT_EN,
  DEFAULT_THEME_PROMPT_ZH,
  defaultGenerationPrompt,
  defaultThemePrompt,
  normalizeSettings,
  resolveGenerationPrompt,
  resolveThemePrompt,
} from '../src/types.ts';

test('空提示词按当前界面语言取默认', () => {
  assert.equal(resolveGenerationPrompt('', 'zh'), DEFAULT_GENERATION_PROMPT_ZH);
  assert.equal(resolveGenerationPrompt('   ', 'en'), DEFAULT_GENERATION_PROMPT_EN);
  assert.equal(resolveThemePrompt('', 'en'), DEFAULT_THEME_PROMPT_EN);
  assert.equal(resolveThemePrompt('', 'zh'), DEFAULT_THEME_PROMPT_ZH);
});

test('存的默认文案属于另一种界面语言时换成当前语言默认', () => {
  // 旧版按默认语言 zh 写进 data.json 的中文默认提示词，在英文界面下不能继续生效
  assert.equal(
    resolveGenerationPrompt(DEFAULT_GENERATION_PROMPT_ZH, 'en'),
    DEFAULT_GENERATION_PROMPT_EN,
  );
  assert.equal(
    resolveThemePrompt(DEFAULT_THEME_PROMPT_ZH, 'en'),
    DEFAULT_THEME_PROMPT_EN,
  );
  // 反向同理
  assert.equal(
    resolveGenerationPrompt(DEFAULT_GENERATION_PROMPT_EN, 'zh'),
    DEFAULT_GENERATION_PROMPT_ZH,
  );
});

test('当前语言自己的默认文案原样返回', () => {
  assert.equal(
    resolveGenerationPrompt(defaultGenerationPrompt('en'), 'en'),
    defaultGenerationPrompt('en'),
  );
  assert.equal(resolveThemePrompt(defaultThemePrompt('zh'), 'zh'), defaultThemePrompt('zh'));
});

test('用户自定义提示词不受界面语言影响', () => {
  const custom = 'Keep it under 12 words, verb first.';
  assert.equal(resolveGenerationPrompt(custom, 'zh'), custom);
  assert.equal(resolveGenerationPrompt(custom, 'en'), custom);
  assert.equal(resolveThemePrompt(custom, 'en'), custom);
});

test('缺失提示词时按界面语言回填默认，已保存的空串保留', () => {
  const filled = normalizeSettings({ language: 'en' });
  assert.equal(filled.title.generationPrompt, DEFAULT_GENERATION_PROMPT_EN);
  assert.equal(filled.title.themePrompt, DEFAULT_THEME_PROMPT_EN);

  const cleared = normalizeSettings({
    language: 'en',
    title: { generationPrompt: '', themePrompt: '' },
  });
  assert.equal(cleared.title.generationPrompt, '');
  assert.equal(cleared.title.themePrompt, '');
});
