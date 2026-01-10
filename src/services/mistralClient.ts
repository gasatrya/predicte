/**
 * Mistral Client Service
 *
 * Production-ready client for Mistral's Codestral FIM API using the official @mistralai/mistralai SDK.
 *
 * IMPORTANT: serverURL should NOT include /v1 (e.g., use https://codestral.mistral.ai, NOT https://codestral.mistral.ai/v1).
 * The SDK appends /v1/fim/completions automatically. Incorrect serverURL causes "no Route matched with those values" errors.
 */

import * as vscode from 'vscode';
import { Mistral } from '@mistralai/mistralai';
import type {
  FIMCompletionRequest,
  FIMCompletionResponse,
  FIMCompletionStreamRequest,
} from '@mistralai/mistralai/models/components';
import { MistralError } from '@mistralai/mistralai/models/errors/mistralerror';
import { HTTPValidationError } from '@mistralai/mistralai/models/errors/httpvalidationerror';
import {
  HTTPClientError,
  ConnectionError,
  RequestTimeoutError,
  RequestAbortedError,
} from '@mistralai/mistralai/models/errors/httpclienterrors';
import type { PredicteConfig } from '../managers/configManager';
import type { PredicteSecretStorage } from './secretStorage';
import { CacheManager } from '../managers/cacheManager';
import type { Logger } from '../utils/logger';
import type { PerformanceMonitor } from '../managers/performanceMetrics';
import * as crypto from 'node:crypto';
import { getLanguageParameters } from '../utils/languageConfig';

/**
 * Error types for Mistral client operations
 */
export class MistralClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MistralClientError';
  }
}

/**
 * Mistral Client Service
 *
 * Provides a high-level interface to Mistral's Codestral FIM API using the official SDK.
 */
export class MistralClient {
  private client: Mistral | null = null;
  private config: PredicteConfig;
  private secretStorage: PredicteSecretStorage;
  private cache: CacheManager<string, string>;
  private logger: Logger;
  private performanceMonitor?: PerformanceMonitor;

  constructor(
    config: PredicteConfig,
    secretStorage: PredicteSecretStorage,
    logger: Logger,
    performanceMonitor?: PerformanceMonitor,
  ) {
    this.config = config;
    this.secretStorage = secretStorage;
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;
    this.cache = new CacheManager(100, config.cacheTTL);
  }

  /**
   * Create a new Mistral SDK client instance
   */
  private createMistralClient(apiKey: string): Mistral {
    const serverURL = this.config.apiBaseUrl;

    // Warn about potential URL construction issues
    if (serverURL.endsWith('/v1') || serverURL.endsWith('/v1/')) {
      this.logger.warn(
        'serverURL ends with /v1. The SDK may append the path again, causing /v1/v1/... in the final URL.',
      );
      this.logger.warn(
        'Try removing /v1 from the serverURL setting and use just the base domain.',
      );
    }

    // Validate and provide hints about endpoint selection
    if (serverURL.includes('codestral')) {
      this.logger.warn(
        'Using Codestral endpoint. Make sure you have a Codestral API key.',
      );
      this.logger.warn(
        'Expected FIM endpoint for Codestral: https://codestral.mistral.ai/v1/fim/completions',
      );
    } else {
      this.logger.warn(
        'Using regular Mistral endpoint. Make sure you have a regular Mistral API key.',
      );
      this.logger.warn(
        'Expected FIM endpoint for Mistral: https://api.mistral.ai/v1/fim/completions',
      );
    }

    return new Mistral({
      apiKey,
      serverURL,
      timeoutMs: this.config.requestTimeout,
      retryConfig: {
        strategy: this.config.enableStreaming ? 'none' : 'backoff',
        backoff: {
          initialInterval: 500,
          maxInterval: 10000,
          exponent: 1.5,
          maxElapsedTime: 15000,
        },
        retryConnectionErrors: false,
      },
    });
  }

  /**
   * Initialize or retrieve the Mistral client singleton
   */
  private async getClient(): Promise<Mistral> {
    if (this.client) {
      return this.client;
    }

    const apiKey = await this.secretStorage.getApiKey();

    if (!apiKey) {
      throw new MistralClientError(
        'API key not found. Please set your Mistral API key in settings.',
        'MISSING_API_KEY',
      );
    }

    this.client = this.createMistralClient(apiKey);
    return this.client;
  }

  /**
   * Generate a cache key for a completion request
   *
   * Uses MD5 hash to create a unique key based on prefix, suffix, model, maxTokens, temperature, and language ID.
   */
  private generateCacheKey(
    prefix: string,
    suffix?: string,
    languageId?: string,
  ): string {
    const keyString = `${prefix}:${suffix ?? ''}:${this.config.model}:${this.config.maxTokens}:${this.config.temperature}:${languageId ?? 'default'}`;
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Get stop sequences for completion generation
   *
   * Prevents overly long completions by stopping at common code block delimiters.
   */
  private getStopSequences(languageId?: string): string[] {
    if (languageId && this.config.languageAwareParametersEnabled) {
      const params = getLanguageParameters(languageId);
      return params.stopSequences;
    }
    // Default stop sequences for backward compatibility
    return ['\n\n', '```', '"""', "'''"];
  }

  private getTemperature(languageId?: string): number {
    if (languageId && this.config.languageAwareParametersEnabled) {
      const params = getLanguageParameters(languageId);
      return params.temperature;
    }
    return this.config.temperature;
  }

  private getMaxTokens(languageId?: string): number {
    if (languageId && this.config.languageAwareParametersEnabled) {
      const params = getLanguageParameters(languageId);
      return params.maxTokens;
    }
    return this.config.maxTokens;
  }

  /**
   * Extract text content from a response (handles both string and ContentChunk[] formats)
   */
  private extractContent(content: unknown): string {
    if (!content) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((chunk) => {
          if (
            chunk &&
            typeof chunk === 'object' &&
            chunk.type === 'text' &&
            'text' in chunk &&
            typeof chunk.text === 'string'
          ) {
            return chunk.text;
          }
          return '';
        })
        .join('');
    }

    return '';
  }

  /**
   * Get a non-streaming FIM completion from Mistral's Codestral API
   */
  async getCompletion(
    prefix: string,
    suffix?: string,
    token?: vscode.CancellationToken,
    systemPrompt?: string,
    languageId?: string,
    temperature?: number,
  ): Promise<string | null> {
    const startTime = Date.now();

    // Check for cancellation
    if (token?.isCancellationRequested) {
      throw new MistralClientError('Request cancelled', 'CANCELLED');
    }

    // Get language-aware parameters
    const languageTemperature = this.getTemperature(languageId);
    const effectiveTemperature = temperature ?? languageTemperature;
    const maxTokens = this.getMaxTokens(languageId);
    const stopSequences = this.getStopSequences(languageId);

    // Check cache first if enabled
    if (this.config.cacheEnabled) {
      const cacheKey = this.generateCacheKey(prefix, suffix, languageId);
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        // Record cache hit
        this.performanceMonitor?.recordCacheHit();
        const latency = Date.now() - startTime;
        this.performanceMonitor?.recordLatency(latency, false);
        this.performanceMonitor?.recordSuccess();
        return cached;
      }
      // Record cache miss
      this.performanceMonitor?.recordCacheMiss();
    }

    const client = await this.getClient();

    // Check for cancellation after async operation
    if (token?.isCancellationRequested) {
      throw new MistralClientError('Request cancelled', 'CANCELLED');
    }

    const request: FIMCompletionRequest = {
      model: this.config.model,
      prompt: prefix,
      suffix: suffix ?? null,
      maxTokens,
      temperature: effectiveTemperature,
      topP: 1,
      stop: stopSequences,
      stream: false,
    };

    // Add system prompt if provided (for prompt engineering)
    if (systemPrompt && systemPrompt.length > 0) {
      // Prepend system prompt to the prefix
      request.prompt = `${systemPrompt}\n\n${prefix}`;
    }

    // Log the request details (excluding full prefix/suffix to avoid huge logs)
    this.logger.debug(
      `Making FIM completion request: ${JSON.stringify({
        model: request.model,
        promptLength: request.prompt?.length ?? 0,
        suffixLength: request.suffix?.length ?? 0,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        topP: request.topP,
        stopSequences: request.stop,
        hasSystemPrompt: systemPrompt && systemPrompt.length > 0,
        systemPromptLength: systemPrompt?.length ?? 0,
      })}`,
    );

    // Log truncated prompt and suffix for debugging
    if (request.prompt) {
      this.logger.debug(
        `Prompt (first 500 chars): ${request.prompt.substring(0, 500)}${request.prompt.length > 500 ? '...' : ''}`,
      );
    }
    if (request.suffix) {
      this.logger.debug(
        `Suffix (first 500 chars): ${request.suffix.substring(0, 500)}${request.suffix.length > 500 ? '...' : ''}`,
      );
    }

    try {
      const response: FIMCompletionResponse =
        await client.fim.complete(request);
      const content = this.extractContent(
        response.choices[0]?.message?.content ?? null,
      );
      const result = content || null;

      // Cache the result if enabled and we got a result
      if (this.config.cacheEnabled && result !== null) {
        const cacheKey = this.generateCacheKey(prefix, suffix, languageId);
        this.cache.set(cacheKey, result, this.config.cacheTTL);
      }

      // Record success metrics
      const latency = Date.now() - startTime;
      this.performanceMonitor?.recordLatency(latency, false);
      this.performanceMonitor?.recordSuccess();

      return result;
    } catch (error) {
      // Record failure metrics
      const latency = Date.now() - startTime;
      this.performanceMonitor?.recordLatency(latency, false);

      const errorType = this.getErrorType(error);
      this.performanceMonitor?.recordFailure(errorType);

      // Special handling for "no Route matched with those values" error
      if (
        error instanceof Error &&
        error.message.includes('no Route matched')
      ) {
        this.logger.error('URL construction issue detected!');
        this.logger.error('The SDK cannot find the FIM endpoint.');
        this.logger.error(
          'This typically happens when serverURL includes /v1 and the SDK appends it again.',
        );
        this.logger.error(
          'Try setting serverURL to: https://codestral.mistral.ai (without /v1)',
        );
        this.logger.error('Or: https://api.mistral.ai (without /v1)');
      }

      if (error instanceof MistralError) {
        this.logger.error(
          `Mistral API Error [${error.statusCode}]: ${error.message}`,
          error,
        );
        // Log additional details for validation errors
        if (error instanceof HTTPValidationError) {
          this.logger.error('Validation errors:', error.data$.detail);
        }
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get multiple completion candidates with slight temperature variations
   *
   * Requests multiple completions with different temperatures for quality filtering and ranking.
   */
  async getMultipleCompletions(
    prefix: string,
    suffix?: string,
    numCandidates: number = 3,
    token?: vscode.CancellationToken,
    systemPrompt?: string,
    languageId?: string,
  ): Promise<(string | null)[]> {
    // Validate numCandidates
    if (numCandidates < 1 || numCandidates > 5) {
      numCandidates = 3;
    }

    // Get base temperature
    const baseTemperature = this.getTemperature(languageId);

    // Create temperature variations for diversity
    const temperatureVariations: number[] = [];
    for (let i = 0; i < numCandidates; i++) {
      // Create slight variations around the base temperature
      // Range: base - 0.05 to base + 0.05, with minimum 0.01
      const variation = (i - (numCandidates - 1) / 2) * 0.05;
      const temp = Math.max(0.01, Math.min(1.0, baseTemperature + variation));
      temperatureVariations.push(temp);
    }

    // Log the request details for multiple completions
    this.logger.debug(
      `Making FIM multiple completions request: ${JSON.stringify({
        model: this.config.model,
        promptLength: prefix?.length ?? 0,
        suffixLength: suffix?.length ?? 0,
        maxTokens: this.getMaxTokens(languageId),
        baseTemperature,
        temperatureVariations,
        numCandidates,
        stopSequences: this.getStopSequences(languageId),
        hasSystemPrompt: systemPrompt && systemPrompt.length > 0,
        systemPromptLength: systemPrompt?.length ?? 0,
      })}`,
    );

    // Log truncated prompt and suffix for debugging
    if (prefix) {
      this.logger.debug(
        `Multiple completions prompt (first 500 chars): ${prefix.substring(0, 500)}${prefix.length > 500 ? '...' : ''}`,
      );
    }
    if (suffix) {
      this.logger.debug(
        `Multiple completions suffix (first 500 chars): ${suffix.substring(0, 500)}${suffix.length > 500 ? '...' : ''}`,
      );
    }

    // Request completions in parallel
    const promises = temperatureVariations.map(async (temp) => {
      try {
        const completion = await this.getCompletion(
          prefix,
          suffix,
          token,
          systemPrompt,
          languageId,
          temp,
        );
        return completion;
      } catch (_error) {
        // Return null for failed requests, allowing others to succeed
        return null;
      }
    });

    const results = await Promise.all(promises);

    return results;
  }

  /**
   * Get a streaming FIM completion from Mistral's Codestral API
   *
   * Yields chunks as they arrive. Does not use caching.
   */
  async *getStreamingCompletion(
    prefix: string,
    suffix?: string,
    token?: vscode.CancellationToken,
    systemPrompt?: string,
    languageId?: string,
  ): AsyncGenerator<string, void, unknown> {
    const startTime = Date.now();

    // Check for cancellation
    if (token?.isCancellationRequested) {
      throw new MistralClientError('Request cancelled', 'CANCELLED');
    }

    const client = await this.getClient();

    // Check for cancellation after async operation
    if (token?.isCancellationRequested) {
      throw new MistralClientError('Request cancelled', 'CANCELLED');
    }

    // Get language-aware parameters
    const temperature = this.getTemperature(languageId);
    const maxTokens = this.getMaxTokens(languageId);
    const stopSequences = this.getStopSequences(languageId);

    const request: FIMCompletionStreamRequest = {
      model: this.config.model,
      prompt: prefix,
      suffix: suffix ?? null,
      maxTokens,
      temperature,
      topP: 1,
      stop: stopSequences,
      stream: true,
    };

    // Add system prompt if provided (for prompt engineering)
    if (systemPrompt && systemPrompt.length > 0) {
      // Prepend system prompt to the prefix
      request.prompt = `${systemPrompt}\n\n${prefix}`;
    }

    // Log the request details for streaming
    this.logger.debug(
      `Making FIM streaming request: ${JSON.stringify({
        model: request.model,
        promptLength: request.prompt?.length ?? 0,
        suffixLength: request.suffix?.length ?? 0,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        topP: request.topP,
        stopSequences: request.stop,
        stream: request.stream,
        hasSystemPrompt: systemPrompt && systemPrompt.length > 0,
        systemPromptLength: systemPrompt?.length ?? 0,
      })}`,
    );

    // Log truncated prompt and suffix for debugging
    if (request.prompt) {
      this.logger.debug(
        `Streaming prompt (first 500 chars): ${request.prompt.substring(0, 500)}${request.prompt.length > 500 ? '...' : ''}`,
      );
    }
    if (request.suffix) {
      this.logger.debug(
        `Streaming suffix (first 500 chars): ${request.suffix.substring(0, 500)}${request.suffix.length > 500 ? '...' : ''}`,
      );
    }

    try {
      const stream = await client.fim.stream(request);

      for await (const event of stream) {
        // Check for cancellation during streaming
        if (token?.isCancellationRequested) {
          break;
        }

        const choice = event.data.choices[0];

        if (choice?.delta?.content) {
          const content = this.extractContent(choice.delta.content);
          if (content) {
            yield content;
          }
        }

        if (choice?.finishReason) {
          break;
        }
      }

      // Record success metrics if streaming completed successfully
      const latency = Date.now() - startTime;
      this.performanceMonitor?.recordLatency(latency, true);
      this.performanceMonitor?.recordSuccess();
    } catch (error) {
      // Record failure metrics
      const latency = Date.now() - startTime;
      this.performanceMonitor?.recordLatency(latency, true);

      const errorType = this.getErrorType(error);
      this.performanceMonitor?.recordFailure(errorType);

      // Special handling for "no Route matched with those values" error
      if (
        error instanceof Error &&
        error.message.includes('no Route matched')
      ) {
        this.logger.error('URL construction issue detected!');
        this.logger.error('The SDK cannot find the FIM endpoint.');
        this.logger.error(
          'This typically happens when serverURL includes /v1 and the SDK appends it again.',
        );
        this.logger.error(
          'Try setting serverURL to: https://codestral.mistral.ai (without /v1)',
        );
        this.logger.error('Or: https://api.mistral.ai (without /v1)');
      }

      if (error instanceof MistralError) {
        this.logger.error(
          `Mistral API Error [${error.statusCode}]: ${error.message}`,
          error,
        );
        // Log additional details for validation errors
        if (error instanceof HTTPValidationError) {
          this.logger.error('Validation errors:', error.data$.detail);
        }
      }
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors and convert them to MistralClientError
   *
   * Provides user-friendly error messages for common error scenarios.
   */
  private handleError(error: unknown): MistralClientError {
    // Check for Mistral SDK errors first
    if (error instanceof MistralError) {
      const statusCode = error.statusCode;
      const errorMessage = error.message;

      switch (statusCode) {
        case 401: {
          // Provide helpful hints for 401 errors
          const endpointHint = this.config.apiBaseUrl.includes('codestral')
            ? '\n\nMake sure you have a Codestral-specific API key from https://console.mistral.ai/'
            : '\n\nMake sure you have a regular Mistral API key from https://console.mistral.ai/';

          return new MistralClientError(
            `Invalid API key. Please check your API key settings.${endpointHint}`,
            'INVALID_API_KEY',
            error,
          );
        }

        case 429:
          return new MistralClientError(
            'Rate limit exceeded. Please wait a moment and try again.',
            'RATE_LIMIT',
            error,
          );

        case 400:
          return new MistralClientError(
            'Bad request. Please check your configuration settings (model, maxTokens, etc.).',
            'BAD_REQUEST',
            error,
          );

        case 422:
          return new MistralClientError(
            `Validation error: ${errorMessage}`,
            'VALIDATION_ERROR',
            error,
          );

        case 500:
        case 502:
        case 503:
        case 504:
          return new MistralClientError(
            'Mistral API is temporarily unavailable. Please try again later.',
            'SERVICE_UNAVAILABLE',
            error,
          );

        default:
          return new MistralClientError(
            `API error (${statusCode}): ${errorMessage}`,
            'API_ERROR',
            error,
          );
      }
    }

    // Handle HTTP client errors (network, timeout, etc.)
    if (error instanceof ConnectionError) {
      return new MistralClientError(
        'Network error: Unable to connect to Mistral API. Please check your internet connection.',
        'NETWORK_ERROR',
        error,
      );
    }

    if (error instanceof RequestTimeoutError) {
      return new MistralClientError(
        'Request timeout: The API request took too long. Please try again.',
        'TIMEOUT_ERROR',
        error,
      );
    }

    if (error instanceof RequestAbortedError) {
      return new MistralClientError(
        'Request was cancelled.',
        'CANCELLED',
        error,
      );
    }

    // Handle generic HTTP client errors
    if (error instanceof HTTPClientError) {
      const message = error instanceof Error ? error.message : String(error);
      return new MistralClientError(
        `Network error: ${message}`,
        'NETWORK_ERROR',
        error,
      );
    }

    // Handle generic errors
    if (error instanceof Error) {
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT')
      ) {
        return new MistralClientError(
          'Network error: Unable to connect to Mistral API. Please check your internet connection.',
          'NETWORK_ERROR',
          error,
        );
      }

      if (error.message.includes('timeout')) {
        return new MistralClientError(
          'Request timeout: The API request took too long. Please try again.',
          'TIMEOUT_ERROR',
          error,
        );
      }
    }

    if (error instanceof MistralClientError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new MistralClientError(
      `Unexpected error: ${message}`,
      'UNEXPECTED_ERROR',
      error,
    );
  }

  private getErrorType(error: unknown): string {
    if (error instanceof MistralClientError) {
      return error.code;
    }

    if (error instanceof MistralError) {
      const statusCode = error.statusCode;
      switch (statusCode) {
        case 401:
          return 'INVALID_API_KEY';
        case 429:
          return 'RATE_LIMIT';
        case 400:
          return 'BAD_REQUEST';
        case 422:
          return 'VALIDATION_ERROR';
        case 500:
        case 502:
        case 503:
        case 504:
          return 'SERVICE_UNAVAILABLE';
        default:
          return `API_ERROR_${statusCode}`;
      }
    }

    if (error instanceof ConnectionError) {
      return 'NETWORK_ERROR';
    }

    if (error instanceof RequestTimeoutError) {
      return 'TIMEOUT_ERROR';
    }

    if (error instanceof RequestAbortedError) {
      return 'CANCELLED';
    }

    if (error instanceof HTTPClientError) {
      return 'HTTP_CLIENT_ERROR';
    }

    if (error instanceof Error) {
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT')
      ) {
        return 'NETWORK_ERROR';
      }

      if (error.message.includes('timeout')) {
        return 'TIMEOUT_ERROR';
      }
    }

    return 'UNKNOWN_ERROR';
  }

  resetClient(): void {
    this.client = null;
  }

  async isReady(): Promise<boolean> {
    try {
      await this.getClient();
      return true;
    } catch {
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats():
    | {
        size: number;
        maxSize: number;
        keys: number;
        utilization: number;
      }
    | undefined {
    if (!this.config.cacheEnabled) {
      return undefined;
    }
    return this.cache.getStats();
  }

  updateConfig(config: PredicteConfig): void {
    this.config = config;

    // Reinitialize cache with new TTL if changed
    if (!config.cacheEnabled) {
      this.cache.clear();
    }

    // Reset client to pick up new timeout/retry settings
    this.resetClient();
  }
}
