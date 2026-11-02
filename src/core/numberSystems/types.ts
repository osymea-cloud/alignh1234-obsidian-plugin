export interface NumberParseResult {
  /** 解析出的数值 */
  value: number;
  /** 从文本开头消耗掉的字符数 */
  consumed: number;
}

/**
 * 编号体系（策略）。
 * v0.0.3 注册 12 种；每个体系只负责解析开头的编号数字与格式化序号。
 */
export interface NumberSystem {
  id: string;
  /** 识别文本开头的编号数字，不是该体系则返回 null */
  parse(text: string): NumberParseResult | null;
  /** 把数字转成该体系的字符串（不含分隔符） */
  format(n: number): string;
}
