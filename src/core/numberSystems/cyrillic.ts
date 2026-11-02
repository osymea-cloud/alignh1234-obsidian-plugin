import type { NumberSystem } from './types.ts';
import { formatSequence, parseSequencePrefix } from './sequence.ts';

/** 俄文字母顺序，跳过 З / О（共 31 个，取小写） */
const CYRILLIC_SEQUENCE: readonly string[] = [
  'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж',
  'и', 'й', 'к', 'л', 'м', 'н', 'п', 'р',
  'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш',
  'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я',
];

export const cyrillicNumberSystem: NumberSystem = {
  id: 'cyrillic',
  parse(text) {
    return parseSequencePrefix(text, CYRILLIC_SEQUENCE);
  },
  format(n) {
    return formatSequence(n, CYRILLIC_SEQUENCE);
  },
};