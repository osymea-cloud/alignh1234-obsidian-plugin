import type { LlmProvider, LlmRequest } from './types.ts';

/** 网络层注入点：Obsidian 里传 requestUrl 适配器，测试里传 fake */
export type LlmRequestFn = (request: LlmRequest) => Promise<LlmHttpResponse>;

export interface LlmHttpResponse {
  status: number;
  text: string;
}

const SYSTEM_PROMPT =
  'You are a precise Markdown outline editor. Follow the user instructions exactly and return only the requested JSON.';

/** 把响应片段里的 key 替换掉，避免 Notice/日志泄露 */
function redact(text: string, apiKey: string): string {
  if (!apiKey) return text;
  return text.split(apiKey).join('***');
}

function summarizeError(response: LlmHttpResponse, apiKey: string): string {
  const snippet = redact((response.text ?? '').trim(), apiKey).slice(0, 200);
  return snippet ? `status ${response.status}: ${snippet}` : `status ${response.status}`;
}

/**
 * 调用一次 LLM，返回纯文本。
 * - 请求失败（非 2xx / 网络异常 / 响应结构异常）统一抛错；
 * - 错误信息会脱敏 API key。
 */
export async function chat(
  provider: LlmProvider,
  apiKey: string,
  prompt: string,
  request: LlmRequestFn,
): Promise<string> {
  const key = apiKey.trim();
  if (!key) throw new Error('API key is empty');

  const payload = provider.buildRequest(provider.defaultModel, key, SYSTEM_PROMPT, prompt);
  const response = await request(payload);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`LLM request failed (${summarizeError(response, key)})`);
  }

  let json: unknown;
  try {
    json = JSON.parse(response.text);
  } catch {
    throw new Error('LLM returned a non-JSON response');
  }

  try {
    return provider.extractText(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM response could not be parsed: ${message}`);
  }
}
