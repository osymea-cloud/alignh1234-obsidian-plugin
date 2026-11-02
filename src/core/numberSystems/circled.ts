import type { NumberSystem } from './types.ts';
import { formatSequence, parseSequencePrefix } from './sequence.ts';

/** ①-⑳（1-20）、㉑-㉟（21-35）、㊱-㊿（36-50） */
const CIRCLED_SEQUENCE: readonly string[] = [
  ...Array.from({ length: 20 }, (_, i) => String.fromCodePoint(0x2460 + i)),
  ...Array.from({ length: 15 }, (_, i) => String.fromCodePoint(0x3251 + i)),
  ...Array.from({ length: 15 }, (_, i) => String.fromCodePoint(0x32b1 + i)),
];

export const circledNumberSystem: NumberSystem = {
  id: 'circled',
  parse(text) {
    return parseSequencePrefix(text, CIRCLED_SEQUENCE);
  },
  format(n) {
    return formatSequence(n, CIRCLED_SEQUENCE);
  },
};