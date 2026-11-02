import type { LlmProviderId } from '../../types.ts';
import type { LlmProvider, LlmRequest } from './types.ts';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function firstString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** OpenAI 兼容协议（DeepSeek / GPT / Qwen / Kimi 共用） */
function buildOpenAiCompatibleRequest(
  url: string,
  model: string,
  apiKey: string,
  system: string,
  user: string,
): LlmRequest {
  return {
    url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    }),
  };
}

function extractOpenAiCompatibleText(response: unknown): string {
  const record = asRecord(response);
  const choices = record?.choices;
  if (!Array.isArray(choices)) throw new Error('response missing choices');
  const first = asRecord(choices[0]);
  const message = asRecord(first?.message);
  const content = firstString(message?.content);
  if (!content) throw new Error('response missing message content');
  return content;
}

function openAiCompatible(
  id: LlmProviderId,
  displayName: string,
  url: string,
  defaultModel: string,
): LlmProvider {
  return {
    id,
    displayName,
    defaultModel,
    buildRequest: (model, apiKey, system, user) =>
      buildOpenAiCompatibleRequest(url, model, apiKey, system, user),
    extractText: extractOpenAiCompatibleText,
  };
}

/** Anthropic Messages API */
const claude: LlmProvider = {
  id: 'claude',
  displayName: 'Claude',
  defaultModel: 'claude-sonnet-4-20250514',
  buildRequest: (model, apiKey, system, user) => ({
    url: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: user }],
      temperature: 0.3,
    }),
  }),
  extractText: (response) => {
    const record = asRecord(response);
    const content = record?.content;
    if (!Array.isArray(content)) throw new Error('response missing content');
    const texts: string[] = [];
    for (const block of content) {
      const item = asRecord(block);
      if (item?.type !== 'text') continue;
      const text = firstString(item?.text);
      if (text) texts.push(text);
    }
    const joined = texts.join('\n').trim();
    if (!joined) throw new Error('response missing text');
    return joined;
  },
};

/** Google Generative Language API */
const gemini: LlmProvider = {
  id: 'gemini',
  displayName: 'Gemini',
  defaultModel: 'gemini-2.0-flash',
  buildRequest: (model, apiKey, system, user) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    }),
  }),
  extractText: (response) => {
    const record = asRecord(response);
    const candidates = record?.candidates;
    if (!Array.isArray(candidates)) throw new Error('response missing candidates');
    const first = asRecord(candidates[0]);
    const content = asRecord(first?.content);
    const parts = content?.parts;
    if (!Array.isArray(parts)) throw new Error('response missing parts');
    const texts: string[] = [];
    for (const part of parts) {
      const item = asRecord(part);
      const text = firstString(item?.text);
      if (text) texts.push(text);
    }
    const joined = texts.join('\n').trim();
    if (!joined) throw new Error('response missing text');
    return joined;
  },
};

/** 六家服务商注册表（顺序与设置页下拉一致） */
export const LLM_PROVIDERS: readonly LlmProvider[] = [
  claude,
  openAiCompatible('deepseek', 'DeepSeek', 'https://api.deepseek.com/chat/completions', 'deepseek-chat'),
  gemini,
  openAiCompatible('gpt', 'GPT', 'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini'),
  openAiCompatible(
    'qwen',
    'Qwen',
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    'qwen-plus',
  ),
  openAiCompatible('kimi', 'Kimi', 'https://api.moonshot.cn/v1/chat/completions', 'moonshot-v1-8k'),
];

const BY_ID = new Map<LlmProviderId, LlmProvider>(
  LLM_PROVIDERS.map((provider): [LlmProviderId, LlmProvider] => [provider.id, provider]),
);

export function getLlmProvider(id: LlmProviderId): LlmProvider | null {
  return BY_ID.get(id) ?? null;
}
