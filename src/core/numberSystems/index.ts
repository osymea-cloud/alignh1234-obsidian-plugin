import type { NumberSystem } from './types.ts';
import { arabicNumberSystem } from './arabic.ts';
import { chineseNumberSystem } from './chinese.ts';
import { circledNumberSystem } from './circled.ts';
import { cyrillicNumberSystem } from './cyrillic.ts';
import { easternArabicNumberSystem } from './easternArabic.ts';
import { circledHangulNumberSystem, hangulNumberSystem } from './hangul.ts';
import { katakanaNumberSystem } from './katakana.ts';
import { latinLowerNumberSystem, latinUpperNumberSystem } from './latin.ts';
import { romanLowerNumberSystem, romanUpperNumberSystem } from './roman.ts';

/** 全部 12 种编号体系；顺序即识别时的尝试顺序 */
const REGISTRY: readonly NumberSystem[] = [
  chineseNumberSystem,
  arabicNumberSystem,
  romanUpperNumberSystem,
  romanLowerNumberSystem,
  latinUpperNumberSystem,
  latinLowerNumberSystem,
  circledNumberSystem,
  circledHangulNumberSystem,
  hangulNumberSystem,
  cyrillicNumberSystem,
  katakanaNumberSystem,
  easternArabicNumberSystem,
];

/** 识别旧编号时按顺序尝试的全部体系 */
export function getAllNumberSystems(): NumberSystem[] {
  return REGISTRY.slice();
}

/** 按 id 取生成用的编号体系 */
export function getNumberSystem(id: string): NumberSystem | null {
  for (const system of REGISTRY) {
    if (system.id === id) return system;
  }
  return null;
}