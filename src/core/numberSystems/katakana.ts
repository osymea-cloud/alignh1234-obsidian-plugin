import type { NumberSystem } from './types.ts';
import { formatSequence, parseSequencePrefix } from './sequence.ts';

/** 片假名伊吕波顺（47 字） */
const KATAKANA_SEQUENCE: readonly string[] = [
  'イ', 'ロ', 'ハ', 'ニ', 'ホ', 'ヘ', 'ト',
  'チ', 'リ', 'ヌ', 'ル', 'ヲ',
  'ワ', 'カ', 'ヨ', 'タ', 'レ', 'ソ',
  'ツ', 'ネ', 'ナ', 'ラ', 'ム',
  'ウ', 'ヰ', 'ノ', 'オ', 'ク', 'ヤ', 'マ',
  'ケ', 'フ', 'コ', 'エ', 'テ',
  'ア', 'サ', 'キ', 'ユ', 'メ', 'ミ', 'シ',
  'ヱ', 'ヒ', 'モ', 'セ', 'ス',
];

export const katakanaNumberSystem: NumberSystem = {
  id: 'katakana',
  parse(text) {
    return parseSequencePrefix(text, KATAKANA_SEQUENCE);
  },
  format(n) {
    return formatSequence(n, KATAKANA_SEQUENCE);
  },
};