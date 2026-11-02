import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { detectTextLanguage } from '../src/core/textLanguage.ts';

test('中文正文识别为中文', () => {
  const markdown = [
    '# 介绍',
    '',
    '这个方法把标题按文档顺序重新编号，并且会跳过代码块与前置元数据。',
    '整理完成后再写回编辑器，整个过程只触发一次撤销。',
  ].join('\n');
  assert.equal(detectTextLanguage(markdown), 'zh');
});

test('日文正文按假名识别为日文', () => {
  const markdown = [
    '# はじめに',
    '',
    'このプラグインは見出しの番号を振り直します。コードブロックは変更しません。',
    '設定ページで言語を切り替えられます。',
  ].join('\n');
  assert.equal(detectTextLanguage(markdown), 'ja');
});

test('韩文正文识别为韩文', () => {
  const markdown = [
    '# 소개',
    '',
    '이 플러그인은 제목 번호를 다시 매기고 코드 블록은 건드리지 않습니다.',
    '설정 페이지에서 언어를 바꿀 수 있습니다.',
  ].join('\n');
  assert.equal(detectTextLanguage(markdown), 'ko');
});

test('俄文正文识别为俄文', () => {
  const markdown = [
    '# Введение',
    '',
    'Этот плагин перенумеровывает заголовки по порядку и не меняет блоки кода.',
    'Настройки можно изменить на странице параметров.',
  ].join('\n');
  assert.equal(detectTextLanguage(markdown), 'ru');
});

test('阿拉伯文正文识别为阿拉伯文', () => {
  const markdown = [
    '# مقدمة',
    '',
    'هذا الملحق يعيد ترقيم العناوين بالترتيب ولا يغير كتل الشيفرة.',
    'يمكن تغيير الإعدادات من صفحة الإعدادات.',
  ].join('\n');
  assert.equal(detectTextLanguage(markdown), 'ar');
});

test('英文正文识别为英文', () => {
  const markdown = [
    '# Introduction',
    '',
    'This plugin renumbers headings in document order and skips code blocks.',
    'The headings are regenerated from the body, and the outline stays consistent.',
  ].join('\n');
  assert.equal(detectTextLanguage(markdown), 'en');
});

test('拉丁字母语言按高频词区分', () => {
  const spanish = [
    '# Introducción',
    '',
    'Este plugin renumera los títulos en el orden del documento y no cambia los bloques de código.',
    'Los ajustes están disponibles para los usuarios desde la página de configuración.',
  ].join('\n');
  assert.equal(detectTextLanguage(spanish), 'es');

  const german = [
    '# Einleitung',
    '',
    'Dieses Plugin nummeriert die Überschriften in der Reihenfolge des Dokuments und ändert die Codeblöcke nicht.',
    'Die Einstellungen werden auf der Einstellungsseite angezeigt und sind nicht versteckt.',
  ].join('\n');
  assert.equal(detectTextLanguage(german), 'de');

  const french = [
    '# Introduction',
    '',
    'Ce plugin renumérote les titres dans l’ordre du document et ne modifie pas les blocs de code.',
    'Les paramètres sont disponibles dans la page de configuration pour vous.',
  ].join('\n');
  assert.equal(detectTextLanguage(french), 'fr');
});

test('代码块与行内代码不参与判定', () => {
  const markdown = [
    '---',
    'title: note',
    '---',
    '',
    '# 整理说明',
    '',
    '这是中文正文，行内代码 `const text = await editor.getValue()` 不应该影响判定。',
    '',
    '```ts',
    'const message = "This code block contains a lot of English words and should be ignored";',
    '```',
  ].join('\n');
  assert.equal(detectTextLanguage(markdown), 'zh');
});

test('样本太短时返回 null，交回模型判断', () => {
  assert.equal(detectTextLanguage(''), null);
  assert.equal(detectTextLanguage('# A\n\nshort'), null);
  assert.equal(detectTextLanguage('```\nconst a = 1;\n```'), null);
});
