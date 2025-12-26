/**
 * Mistral Client Service
 *
 * This module provides a production-ready client for Mistral's Codestral FIM API
 * using the official @mistralai/mistralai SDK (v1.11.0).
 *
 * Features:
 * - Non-streaming and streaming FIM completions
 * - Built-in caching with configurable TTL
 * - Automatic retry with exponential backoff
 * - Comprehensive error handling
 * - Client reset when API key changes
 * - Support for both Mistral and Codestral API endpoints
 *
 * API Endpoints:
 * - Regular Mistral: https://api.mistral.ai (for Mistral API keys)
 * - Codestral: https://codestral.mistral.ai (for Codestral-specific API keys)
 * - FIM Complete: /v1/fim/completions
 *
 * IMPORTANT: serverURL Configuration
 * ====================================
 * The SDK appends the API version path (/v1/fim/completions) to the serverURL.
 * Therefore, serverURL should NOT include /v1 in the path.
 *
 * CORRECT serverURL examples:
 * - https://api.mistral.ai (Mistral regular endpoint)
 * - https://codestral.mistral.ai (Codestral-specific endpoint)
 *
 * INCORRECT serverURL examples (will cause URL construction issues):
 * - https://api.mistral.ai/v1
 * - https://codestral.mistral.ai/v1
 * - https://api.mistral.ai/v1/
 *
 * Using incorrect serverURL will result in URLs like:
 * https://codestral.mistral.ai/v1/v1/fim/completions
 * which causes "no Route matched with those values" errors.
 *
 * Supported Models:
 * - codestral-latest (recommended)
 * - codestral-22b
 * - codestral-2405
 * - codestral-2404
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
import { logger } from '../utils/logger';
import * as crypto from 'node:crypto';
import { getLanguageParameters } from '../utils/codeUtils';

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

  constructor(config: PredicteConfig, secretStorage: PredicteSecretStorage) {
    this.config = config;
    this.secretStorage = secretStorage;
    this.cache = new CacheManager(100, config.cacheTTL);
  }

  /**
   * Create a new Mistral SDK client instance
   *
   * @param apiKey The API key (Mistral or Codestral)
   * @returns Configured Mistral client
   */
  private createMistralClient(apiKey: string): Mistral {
    const serverURL = this.config.apiBaseUrl;
    console.warn(
      `[DEBUG] Creating Mistral client with serverURL: ${serverURL}`,
    );
    console.warn(
      `[DEBUG] serverURL ends with /v1: ${serverURL.endsWith('/v1')}`,
    );
    console.warn(`[DEBUG] serverURL ends with /: ${serverURL.endsWith('/')}`);

    // Warn about potential URL construction issues
    if (serverURL.endsWith('/v1') || serverURL.endsWith('/v1/')) {
      console.warn(
        '[WARNING] serverURL ends with /v1. The SDK may append the path again, causing /v1/v1/... in the final URL.',
      );
      console.warn(
        '[WARNING] Try removing /v1 from the serverURL setting and use just the base domain.',
      );
    }

    // Validate and provide hints about endpoint selection
    if (serverURL.includes('codestral')) {
      console.warn(
        '[INFO] Using Codestral endpoint. Make sure you have a Codestral API key.',
      );
      console.warn(
        '[INFO] Expected FIM endpoint for Codestral: https://codestral.mistral.ai/v1/fim/completions',
      );
    } else {
      console.warn(
        '[INFO] Using regular Mistral endpoint. Make sure you have a regular Mistral API key.',
      );
      console.warn(
        '[INFO] Expected FIM endpoint for Mistral: https://api.mistral.ai/v1/fim/completions',
      );
    }

    // Construct expected full URL for debugging
    let expectedURL: string;
    if (serverURL.endsWith('/v1') || serverURL.endsWith('/v1/')) {
      expectedURL = serverURL.replace(/\/v1\/?$/, '') + '/v1/fim/completions';
    } else if (serverURL.endsWith('/')) {
      expectedURL = serverURL + 'v1/fim/completions';
    } else {
      expectedURL = serverURL + '/v1/fim/completions';
    }
    console.warn(`[DEBUG] Expected FIM complete URL: ${expectedURL}`);

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
   *
   * @throws MistralClientError if API key is not available
   */
  private async getClient(): Promise<Mistral> {
    console.warn('[DEBUG] getClient called');
    if (this.client) {
      console.warn('[DEBUG] Returning existing client');
      return this.client;
    }

    console.warn('[DEBUG] Retrieving API key from secret storage...');
    const apiKey = await this.secretStorage.getApiKey();

    console.warn('[DEBUG] API key available:', apiKey ? 'YES' : 'NO');
    console.warn('[DEBUG] API base URL:', this.config.apiBaseUrl);

    if (!apiKey) {
      console.warn('[DEBUG] API key not found, throwing MISSING_API_KEY error');
      throw new MistralClientError(
        'API key not found. Please set your Mistral API key in settings.',
        'MISSING_API_KEY',
      );
    }

    console.warn('[DEBUG] Creating new Mistral client...');
    this.client = this.createMistralClient(apiKey);
    console.warn('[DEBUG] Mistral client created successfully');
    return this.client;
  }

  /**
   * Generate a cache key for a completion request
   *
   * Uses MD5 hash to create a unique key based on:
   * - prefix text
   * - suffix text
   * - model
   * - maxTokens
   * - temperature
   * - language ID (when language-aware parameters are enabled)
   *
   * @param prefix The prefix text
   * @param suffix The suffix text (optional)
   * @param languageId The language identifier (optional)
   * @returns MD5 hash string
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
   * These sequences prevent overly long completions by stopping when
   * common code block delimiters are encountered. Uses language-aware
   * sequences when language-aware parameters are enabled.
   *
   * @param languageId The language identifier (optional)
   * @returns Array of stop sequences
   */
  private getStopSequences(languageId?: string): string[] {
    if (languageId && this.config.languageAwareParametersEnabled) {
      const params = getLanguageParameters(languageId);
      return params.stopSequences;
    }
    // Default stop sequences for backward compatibility
    return ['\n\n', '```', '"""', "'''"];
  }

  /**
   * Get language-aware temperature value
   *
   * Returns language-specific temperature when language-aware parameters
   * are enabled, otherwise returns the configured temperature.
   *
   * @param languageId The language identifier (optional)
   * @returns Temperature value
   */
  private getTemperature(languageId?: string): number {
    if (languageId && this.config.languageAwareParametersEnabled) {
      const params = getLanguageParameters(languageId);
      return params.temperature;
    }
    return this.config.temperature;
  }

  /**
   * Get language-aware maxTokens value
   *
   * Returns language-specific maxTokens when language-aware parameters
   * are enabled, otherwise returns the configured maxTokens.
   *
   * @param languageId The language identifier (optional)
   * @returns MaxTokens value
   */
  private getMaxTokens(languageId?: string): number {
    if (languageId && this.config.languageAwareParametersEnabled) {
      const params = getLanguageParameters(languageId);
      return params.maxTokens;
    }
    return this.config.maxTokens;
  }

  /**
   * Extract text content from a response (handles both string and ContentChunk[] formats)
   *
   * @param content The content from the API response
   * @returns Extracted text as a string
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
   *
   * @param prefix The prefix text before the cursor
   * @param suffix The suffix text after the cursor (optional)
   * @param token Optional cancellation token to abort the request
   * @param systemPrompt Optional system prompt for prompt engineering
   * @param languageId The language identifier for language-aware parameters (optional)
   * @param temperature Optional temperature override (for multiple candidates)
   * @returns Promise resolving to the completion text, or null if no completion
   * @throws MistralClientError if the request fails
   */
  async getCompletion(
    prefix: string,
    suffix?: string,
    token?: vscode.CancellationToken,
    systemPrompt?: string,
    languageId?: string,
    temperature?: number,
  ): Promise<string | null> {
    console.warn('[DEBUG] MistralClient.getCompletion called');
    // Check for cancellation
    if (token?.isCancellationRequested) {
      console.warn('[DEBUG] Request cancelled in getCompletion');
      throw new MistralClientError('Request cancelled', 'CANCELLED');
    }

    // Get language-aware parameters
    const languageTemperature = this.getTemperature(languageId);
    const effectiveTemperature = temperature ?? languageTemperature;
    const maxTokens = this.getMaxTokens(languageId);
    const stopSequences = this.getStopSequences(languageId);

    // Check cache first if enabled
    if (this.config.cacheEnabled) {
      console.warn('[DEBUG] Cache enabled, checking for cached result...');
      const cacheKey = this.generateCacheKey(prefix, suffix, languageId);
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        console.warn('[DEBUG] Returning cached result');
        return cached;
      }
      console.warn('[DEBUG] No cached result found');
    }

    console.warn('[DEBUG] Getting client...');
    const client = await this.getClient();

    // Check for cancellation after async operation
    if (token?.isCancellationRequested) {
      console.warn('[DEBUG] Request cancelled after getClient');
      throw new MistralClientError('Request cancelled', 'CANCELLED');
    }

    console.warn('[DEBUG] Model:', this.config.model);
    console.warn('[DEBUG] Max tokens:', maxTokens);
    console.warn('[DEBUG] Temperature:', effectiveTemperature);
    console.warn('[DEBUG] Language ID:', languageId ?? 'default');
    console.warn(
      '[DEBUG] Language-aware parameters enabled:',
      this.config.languageAwareParametersEnabled,
    );
    console.warn('[DEBUG] System prompt length:', systemPrompt?.length ?? 0);

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

    console.warn('[DEBUG] About to call client.fim.complete...');
    console.warn('[DEBUG] Request model:', request.model);
    console.warn('[DEBUG] Request prompt length:', request.prompt?.length ?? 0);
    console.warn('[DEBUG] Request suffix length:', request.suffix?.length ?? 0);
    console.warn('[DEBUG] Request maxTokens:', request.maxTokens);
    console.warn('[DEBUG] Request stream:', request.stream);
    try {
      const response: FIMCompletionResponse =
        await client.fim.complete(request);
      console.warn('[DEBUG] Received response from Mistral API');
      console.warn('[DEBUG] Response status: success');
      const content = this.extractContent(
        response.choices[0]?.message?.content ?? null,
      );
      const result = content || null;

      console.warn('[DEBUG] Extracted content length:', content.length);
      console.warn('[DEBUG] Result:', result ? 'has content' : 'null');

      // Cache the result if enabled and we got a result
      if (this.config.cacheEnabled && result !== null) {
        console.warn('[DEBUG] Caching result...');
        const cacheKey = this.generateCacheKey(prefix, suffix, languageId);
        this.cache.set(cacheKey, result, this.config.cacheTTL);
      }

      return result;
    } catch (error) {
      console.warn('[DEBUG] Error in getCompletion:', error);
      if (error instanceof Error) {
        console.warn('[DEBUG] Error name:', error.name);
        console.warn('[DEBUG] Error message:', error.message);
        console.warn('[DEBUG] Error stack:', error.stack);
      }

      // Special handling for "no Route matched with those values" error
      if (
        error instanceof Error &&
        error.message.includes('no Route matched')
      ) {
        console.warn('[ERROR] URL construction issue detected!');
        console.warn('[ERROR] The SDK cannot find the FIM endpoint.');
        console.warn(
          '[ERROR] This typically happens when serverURL includes /v1 and the SDK appends it again.',
        );
        console.warn(
          '[ERROR] Try setting serverURL to: https://codestral.mistral.ai (without /v1)',
        );
        console.warn('[ERROR] Or: https://api.mistral.ai (without /v1)');
      }

      if (error instanceof MistralError) {
        console.warn('[DEBUG] MistralError statusCode:', error.statusCode);
        console.warn('[DEBUG] MistralError body:', error.body);
        logger.error(
          `Mistral API Error [${error.statusCode}]: ${error.message}`,
          error,
        );
        // Log additional details for validation errors
        if (error instanceof HTTPValidationError) {
          logger.error('Validation errors:', error.data$.detail);
        }
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get multiple completion candidates with slight temperature variations
   *
   * Requests multiple completions from the API with different temperatures
   * to generate diverse candidates for quality filtering and ranking.
   *
   * @param prefix The prefix text before the cursor
   * @param suffix The suffix text after the cursor (optional)
   * @param numCandidates Number of candidates to generate (1-5)
   * @param token Optional cancellation token to abort the requests
   * @param systemPrompt Optional system prompt for prompt engineering
   * @param languageId The language identifier for language-aware parameters (optional)
   * @returns Promise resolving to array of completion texts (may contain nulls)
   * @throws MistralClientError if all requests fail
   */
  async getMultipleCompletions(
    prefix: string,
    suffix?: string,
    numCandidates: number = 3,
    token?: vscode.CancellationToken,
    systemPrompt?: string,
    languageId?: string,
  ): Promise<(string | null)[]> {
    console.warn(
      '[DEBUG] getMultipleCompletions called, numCandidates:',
      numCandidates,
    );

    // Validate numCandidates
    if (numCandidates < 1 || numCandidates > 5) {
      console.warn('[DEBUG] Invalid numCandidates, using default of 3');
      numCandidates = 3;
    }

    // Get base temperature
    const baseTemperature = this.getTemperature(languageId);
    console.warn('[DEBUG] Base temperature:', baseTemperature);

    // Create temperature variations for diversity
    const temperatureVariations: number[] = [];
    for (let i = 0; i < numCandidates; i++) {
      // Create slight variations around the base temperature
      // Range: base - 0.05 to base + 0.05, with minimum 0.01
      const variation = (i - (numCandidates - 1) / 2) * 0.05;
      const temp = Math.max(0.01, Math.min(1.0, baseTemperature + variation));
      temperatureVariations.push(temp);
    }

    console.warn('[DEBUG] Temperature variations:', temperatureVariations);

    // Request completions in parallel
    const promises = temperatureVariations.map(async (temp, index) => {
      console.warn(
        `[DEBUG] Requesting candidate ${index + 1}/${numCandidates} with temperature ${temp}`,
      );

      try {
        const completion = await this.getCompletion(
          prefix,
          suffix,
          token,
          systemPrompt,
          languageId,
          temp,
        );
        console.warn(
          `[DEBUG] Candidate ${index + 1}/${numCandidates} received:`,
          completion ? 'success' : 'null',
        );
        return completion;
      } catch (error) {
        console.warn(
          `[DEBUG] Candidate ${index + 1}/${numCandidates} failed:`,
          error,
        );
        // Return null for failed requests, allowing others to succeed
        return null;
      }
    });

    const results = await Promise.all(promises);
    console.warn('[DEBUG] All candidates received');

    // Count successful completions
    const successfulCount = results.filter((r) => r !== null).length;
    console.warn(
      '[DEBUG] Successful completions:',
      successfulCount,
      '/',
      numCandidates,
    );

    return results;
  }

  /**
   * Get a streaming FIM completion from Mistral's Codestral API
   *
   * Yields each chunk of the completion as it arrives from the API.
   * Does not use caching for streaming responses.
   *
   * @param prefix The prefix text before the cursor
   * @param suffix The suffix text after the cursor (optional)
   * @param token Optional cancellation token to abort the request
   * @param systemPrompt Optional system prompt for prompt engineering
   * @param languageId The language identifier for language-aware parameters (optional)
   * @returns Async generator yielding completion text chunks
   * @throws MistralClientError if the request fails
   */
  async *getStreamingCompletion(
    prefix: string,
    suffix?: string,
    token?: vscode.CancellationToken,
    systemPrompt?: string,
    languageId?: string,
  ): AsyncGenerator<string, void, unknown> {
    console.warn('[DEBUG] MistralClient.getStreamingCompletion called');
    // Check for cancellation
    if (token?.isCancellationRequested) {
      console.warn('[DEBUG] Request cancelled in getStreamingCompletion');
      throw new MistralClientError('Request cancelled', 'CANCELLED');
    }

    console.warn('[DEBUG] Getting client for streaming...');
    const client = await this.getClient();

    // Check for cancellation after async operation
    if (token?.isCancellationRequested) {
      console.warn('[DEBUG] Request cancelled after getClient in streaming');
      throw new MistralClientError('Request cancelled', 'CANCELLED');
    }

    // Get language-aware parameters
    const temperature = this.getTemperature(languageId);
    const maxTokens = this.getMaxTokens(languageId);
    const stopSequences = this.getStopSequences(languageId);

    console.warn('[DEBUG] Model:', this.config.model);
    console.warn('[DEBUG] Max tokens:', maxTokens);
    console.warn('[DEBUG] Temperature:', temperature);
    console.warn('[DEBUG] Language ID:', languageId ?? 'default');
    console.warn(
      '[DEBUG] Language-aware parameters enabled:',
      this.config.languageAwareParametersEnabled,
    );
    console.warn('[DEBUG] System prompt length:', systemPrompt?.length ?? 0);

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

    console.warn('[DEBUG] About to call client.fim.stream...');
    console.warn('[DEBUG] Request model:', request.model);
    console.warn('[DEBUG] Request prompt length:', request.prompt?.length ?? 0);
    console.warn('[DEBUG] Request suffix length:', request.suffix?.length ?? 0);
    console.warn('[DEBUG] Request maxTokens:', request.maxTokens);
    console.warn('[DEBUG] Request stream:', request.stream);
    try {
      const stream = await client.fim.stream(request);
      console.warn('[DEBUG] Stream created, starting to read events...');

      let eventCount = 0;
      let chunkCount = 0;
      for await (const event of stream) {
        eventCount++;

        // Check for cancellation during streaming
        if (token?.isCancellationRequested) {
          console.warn('[DEBUG] Streaming cancelled, breaking');
          break;
        }

        const choice = event.data.choices[0];

        if (choice?.delta?.content) {
          const content = this.extractContent(choice.delta.content);
          if (content) {
            chunkCount++;
            console.warn(
              '[DEBUG] Yielding chunk',
              chunkCount,
              'length:',
              content.length,
            );
            yield content;
          }
        }

        if (choice?.finishReason) {
          console.warn('[DEBUG] Stream finished, reason:', choice.finishReason);
          break;
        }
      }
      console.warn(
        '[DEBUG] Stream loop ended, events:',
        eventCount,
        'chunks:',
        chunkCount,
      );
    } catch (error) {
      console.warn('[DEBUG] Error in getStreamingCompletion:', error);
      if (error instanceof Error) {
        console.warn('[DEBUG] Error name:', error.name);
        console.warn('[DEBUG] Error message:', error.message);
        console.warn('[DEBUG] Error stack:', error.stack);
      }

      // Special handling for "no Route matched with those values" error
      if (
        error instanceof Error &&
        error.message.includes('no Route matched')
      ) {
        console.warn('[ERROR] URL construction issue detected!');
        console.warn('[ERROR] The SDK cannot find the FIM endpoint.');
        console.warn(
          '[ERROR] This typically happens when serverURL includes /v1 and the SDK appends it again.',
        );
        console.warn(
          '[ERROR] Try setting serverURL to: https://codestral.mistral.ai (without /v1)',
        );
        console.warn('[ERROR] Or: https://api.mistral.ai (without /v1)');
      }

      if (error instanceof MistralError) {
        console.warn('[DEBUG] MistralError statusCode:', error.statusCode);
        console.warn('[DEBUG] MistralError body:', error.body);
        logger.error(
          `Mistral API Error [${error.statusCode}]: ${error.message}`,
          error,
        );
        // Log additional details for validation errors
        if (error instanceof HTTPValidationError) {
          logger.error('Validation errors:', error.data$.detail);
        }
      }
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors and convert them to MistralClientError
   *
   * Provides user-friendly error messages for common error scenarios.
   *
   * @param error The error to handle
   * @throws MistralClientError with user-friendly message
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

  /**
   * Reset the client instance (e.g., after API key change)
   *
   * This clears the cached Mistral client and forces re-initialization
   * on the next request.
   */
  resetClient(): void {
    this.client = null;
  }

  /**
   * Check if the client is ready to make requests
   *
   * Verifies that an API key is available and the client can be initialized.
   *
   * @returns Promise resolving to true if ready, false otherwise
   */
  async isReady(): Promise<boolean> {
    try {
      await this.getClient();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cached completions
   *
   * This removes all entries from the cache, forcing subsequent requests
   * to fetch fresh data from the API.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics object, or undefined if cache is disabled
   */
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

  /**
   * Update configuration settings
   *
   * Called when user changes configuration settings.
   * Reinitializes cache with new TTL and resets client if needed.
   *
   * @param config The new configuration
   */
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
