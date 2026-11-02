import type { NumberSystem } from './types.ts';
import { formatSequence, parseSequencePrefix } from './sequence.ts';

/** 韩文顺序：가 나 다 라 마 바 사 아 자 차 카 타 파 하（14 个） */
const HANGUL_SEQUENCE: readonly string[] = [
  '가', '나', '다', '라', '마', '바', '사',
  '아', '자', '차', '카', '타', '파', '하',
];

/** 带圈韩文：㉮-㉻（14 个） */
const CIRCLED_HANGUL_SEQUENCE: readonly string[] = Array.from({ length: 14 }, (_, i) =>
  String.fromCodePoint(0x326e + i),
);

export const hangulNumberSystem: NumberSystem = {
  id: 'hangul',
  parse(text) {
    return parseSequencePrefix(text, HANGUL_SEQUENCE);
  },
  format(n) {
    return formatSequence(n, HANGUL_SEQUENCE);
  },
};

export const circledHangulNumberSystem: NumberSystem = {
  id: 'circled-hangul',
  parse(text) {
    return parseSequencePrefix(text, CIRCLED_HANGUL_SEQUENCE);
  },
  format(n) {
    return formatSequence(n, CIRCLED_HANGUL_SEQUENCE);
  },
};