import { setTimeout as delay } from 'node:timers/promises';
import type { Config } from './config.js';
import { ApiError } from './errors.js';
import type { ToolCall } from './assistant-tools.js';

export type Part = { text?: string; functionCall?: ToolCall; [key: string]: unknown };
export type Content = { role: string; parts: Part[] };
type ProviderOptions = {
  fetch?: typeof fetch;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  log?: (event: { event: string; status: number; model: string; attempt: number; code: string }) => void;
};

function rejection(status: number, payload: unknown): ApiError {
  const error = (payload as { error?: { details?: { reason?: string }[] } } | null)?.error;
  const invalidKey = Array.isArray(error?.details) && error.details.some(detail => ['API_KEY_INVALID', 'API_KEY_EXPIRED'].includes(detail?.reason ?? ''));
  if (invalidKey || status === 401) return new ApiError(502, 'GEMINI_AUTH_ERROR', 'Gemini rejected the server API key. Check that the key is valid and enabled for the Gemini API.');
  if (status === 403) return new ApiError(502, 'GEMINI_PERMISSION_ERROR', 'The server API key does not have access to this Gemini model. Check its API restrictions and project permissions.');
  if (status === 404) return new ApiError(502, 'GEMINI_MODEL_UNAVAILABLE', 'The configured Gemini model is unavailable for this API key. Check the server model setting.');
  if (status === 429) return new ApiError(429, 'GEMINI_QUOTA', 'Gemini quota or rate limit reached. Try again later or check the project quota.');
  if (status === 400) return new ApiError(502, 'GEMINI_INVALID_REQUEST', 'Gemini could not process the assistant request format. Start a new assistant conversation; if it persists, check the server configuration.');
  if ([408, 500, 502, 503, 504].includes(status)) return new ApiError(503, 'GEMINI_UNAVAILABLE', 'Gemini is temporarily unavailable. Please try again shortly.');
  return new ApiError(502, 'GEMINI_ERROR', 'Gemini could not complete this request. Try again shortly.');
}

export function createGeminiGenerator(config: Pick<Config, 'GEMINI_API_KEY' | 'GEMINI_MODEL'>, options: ProviderOptions = {}) {
  const fetchProvider = options.fetch ?? fetch;
  const wait = options.wait ?? (async (milliseconds: number, signal: AbortSignal) => { await delay(milliseconds, undefined, { signal }); });
  const log = options.log ?? (event => console.error(JSON.stringify(event)));
  return async (body: unknown, signal: AbortSignal): Promise<Content> => {
    // Only retry generation, before any tools execute. Never retry application writes.
    const requestBody = JSON.stringify(body);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetchProvider(`https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent`, {
          method: 'POST', headers: { 'x-goog-api-key': config.GEMINI_API_KEY!, 'Content-Type': 'application/json' },
          body: requestBody, signal,
        });
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const error = rejection(response.status, result);
          // No raw provider errors, request text, tokens or API keys enter logs.
          log({ event: 'gemini_rejected', status: response.status, model: config.GEMINI_MODEL, attempt: attempt + 1, code: error.code });
          if (error.code !== 'GEMINI_UNAVAILABLE' || attempt === 2) throw error;
        } else {
          const content = (result as { candidates?: { content?: Content }[] } | null)?.candidates?.[0]?.content;
          if (!content?.parts?.length) throw new ApiError(502, 'ASSISTANT_EMPTY', 'Gemini did not return a response. Try rephrasing your request.');
          return content;
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (signal.aborted || attempt === 2) throw new ApiError(503, 'ASSISTANT_UNAVAILABLE', 'Gemini could not be reached. Try again shortly.');
        log({ event: 'gemini_transport_error', status: 0, model: config.GEMINI_MODEL, attempt: attempt + 1, code: 'ASSISTANT_UNAVAILABLE' });
      }
      try { await wait(750 * (2 ** attempt), signal); }
      catch { throw new ApiError(503, 'ASSISTANT_UNAVAILABLE', 'Gemini could not be reached. Try again shortly.'); }
    }
    throw new ApiError(503, 'GEMINI_UNAVAILABLE', 'Gemini is temporarily unavailable. Please try again shortly.');
  };
}
