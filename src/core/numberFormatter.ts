import type { LevelConfig } from '../types.ts';
import { DEFAULT_DELIMITER_ID, getDelimiter } from './delimiters.ts';
import { getNumberSystem } from './numberSystems/index.ts';

/**
 * 生成新的编号 token（前缀 + 数字 + 后缀，不含尾随空格）。
 * style 为 none 时返回空串（用于清除编号）。
 */
export function formatNumberToken(n: number, config: LevelConfig): string {
  if (config.style === 'none') return '';
  const system = getNumberSystem(config.style);
  if (!system) throw new Error(`未知编号体系：${config.style}`);

  const delimiter =
    getDelimiter(config.delimiterId) ?? getDelimiter(DEFAULT_DELIMITER_ID);
  const prefix = delimiter?.prefix ?? '';
  const suffix = delimiter?.suffix ?? '';

  return prefix + system.format(n) + suffix;
}