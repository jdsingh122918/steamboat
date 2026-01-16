/**
 * OpenRouter Client
 *
 * HTTP client for OpenRouter API using OpenAI-compatible message format.
 * Provides a unified interface to multiple LLM providers.
 */

import { getModelDefinition } from './model-registry';
import { executeWithFallback, type FallbackOptions, type FallbackResult } from './fallback-handler';

/**
 * OpenRouter API endpoint
 */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * OpenAI-compatible message format
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/**
 * Content part for multimodal messages
 */
export type ContentPart = TextContent | ImageContent;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' | 'text' };
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  id: string;
  model: string;
  object: 'chat.completion';
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter API error
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

/**
 * OpenRouter client options
 */
export interface OpenRouterClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  defaultModel?: string;
}

/**
 * Execute options for a completion request
 */
export interface ExecuteOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  fallbackOptions?: FallbackOptions;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  fallbackCount: number;
}

/**
 * OpenRouter API Client
 */
export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private defaultModel: string;

  constructor(options: OpenRouterClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
    this.baseUrl = options.baseUrl ?? OPENROUTER_API_URL;
    this.timeout = options.timeout ?? 60000;
    this.defaultModel = options.defaultModel ?? 'anthropic/claude-3.5-sonnet';

    // Skip validation if SKIP_ENV_VALIDATION is set
    const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';
    if (!this.apiKey && !skipValidation) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
  }

  /**
   * Create a chat completion
   */
  async createCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://steamboat.app',
          'X-Title': 'Steamboat',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new OpenRouterError(
          errorBody.error?.message ?? `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorBody.error?.code
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenRouterError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new OpenRouterError('Request timed out', undefined, 'TIMEOUT');
        }
        throw new OpenRouterError(error.message, undefined, 'CONNECTION_ERROR');
      }

      throw new OpenRouterError('Unknown error occurred');
    }
  }

  /**
   * Execute a completion with automatic fallback support
   */
  async execute(options: ExecuteOptions): Promise<FallbackResult<ExecutionResult>> {
    const { model, messages, maxTokens, temperature, jsonMode, fallbackOptions } = options;

    // Check if model requires vision and messages contain images
    const hasImages = messages.some(
      (m) =>
        Array.isArray(m.content) &&
        m.content.some((c) => c.type === 'image_url')
    );

    const effectiveFallbackOptions: FallbackOptions = {
      ...fallbackOptions,
      requiresVision: hasImages,
    };

    return executeWithFallback<ExecutionResult>(
      model,
      async (modelId) => {
        const modelDef = getModelDefinition(modelId);
        const effectiveMaxTokens = maxTokens ?? modelDef?.maxOutputTokens ?? 4096;

        const request: ChatCompletionRequest = {
          model: modelId,
          messages,
          max_tokens: effectiveMaxTokens,
          temperature: temperature ?? 0.7,
        };

        if (jsonMode) {
          request.response_format = { type: 'json_object' };
        }

        const response = await this.createCompletion(request);

        const textContent = response.choices[0]?.message?.content ?? '';

        return {
          text: textContent,
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          model: response.model,
          fallbackCount: 0, // Will be set by executeWithFallback
        };
      },
      effectiveFallbackOptions
    );
  }
}

/**
 * Convert Anthropic-style image content to OpenAI-style
 * Used for migrating existing code
 */
export function convertToOpenRouterImageFormat(
  anthropicContent: { type: 'image'; source: { type: 'url'; url: string } }
): ImageContent {
  return {
    type: 'image_url',
    image_url: {
      url: anthropicContent.source.url,
    },
  };
}

/**
 * Convert Anthropic-style message array to OpenRouter format
 */
export function convertAnthropicMessages(
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; source?: { type: string; url: string } }>;
  }>
): ChatMessage[] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return {
        role: msg.role,
        content: msg.content,
      };
    }

    // Convert array content
    const content: ContentPart[] = msg.content.map((part) => {
      if (part.type === 'text') {
        return {
          type: 'text' as const,
          text: part.text ?? '',
        };
      }
      if (part.type === 'image' && part.source?.type === 'url') {
        return {
          type: 'image_url' as const,
          image_url: {
            url: part.source.url,
          },
        };
      }
      // Default to text for unknown types
      return {
        type: 'text' as const,
        text: '',
      };
    });

    return {
      role: msg.role,
      content,
    };
  });
}

// Singleton instance
let globalClient: OpenRouterClient | null = null;

/**
 * Get the global OpenRouter client instance
 */
export function getOpenRouterClient(): OpenRouterClient {
  if (!globalClient) {
    globalClient = new OpenRouterClient();
  }
  return globalClient;
}

/**
 * Reset the global client (for testing)
 */
export function resetOpenRouterClient(): void {
  globalClient = null;
}
