import type { LlmProviderId } from '../../types.ts';

/** 发送给服务商的 HTTP 请求（与 Obsidian requestUrl 解耦，便于测试） */
export interface LlmRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}

/** 服务商适配器：负责组请求 + 从响应 JSON 中取文本 */
export interface LlmProvider {
  /** 稳定 id，保存在设置里 */
  id: LlmProviderId;
  /** 设置页展示名（i18n 未覆盖时的兜底） */
  displayName: string;
  /** 内置默认模型 */
  defaultModel: string;
  /** 组一次 chat 请求 */
  buildRequest(model: string, apiKey: string, system: string, user: string): LlmRequest;
  /** 从响应 JSON 中提取纯文本；结构异常时抛错 */
  extractText(response: unknown): string;
}
