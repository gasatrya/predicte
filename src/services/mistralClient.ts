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
 *
 * API Endpoints:
 * - FIM Complete: /v1/fim/completions
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
import * as crypto from 'node:crypto';

/**
 * Error types for Mistral client operations
 */
export class MistralClientError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly cause?: unknown
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
     * @param apiKey The Mistral API key
     * @returns Configured Mistral client
     */
    private createMistralClient(apiKey: string): Mistral {
        return new Mistral({
            apiKey,
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
        if (this.client) {
            return this.client;
        }

        const apiKey = await this.secretStorage.getApiKey();

        if (!apiKey) {
            throw new MistralClientError(
                'API key not found. Please set your Mistral API key.',
                'MISSING_API_KEY'
            );
        }

        this.client = this.createMistralClient(apiKey);
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
     *
     * @param prefix The prefix text
     * @param suffix The suffix text (optional)
     * @returns MD5 hash string
     */
    private generateCacheKey(prefix: string, suffix?: string): string {
        const keyString = `${prefix}:${suffix || ''}:${this.config.model}:${this.config.maxTokens}:${this.config.temperature}`;
        return crypto.createHash('md5').update(keyString).digest('hex');
    }

    /**
     * Get stop sequences for completion generation
     *
     * These sequences prevent overly long completions by stopping when
     * common code block delimiters are encountered.
     *
     * @returns Array of stop sequences
     */
    private getStopSequences(): string[] {
        return ['\n\n', '```', '"""', "'''"];
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
     * @returns Promise resolving to the completion text, or null if no completion
     * @throws MistralClientError if the request fails
     */
    async getCompletion(
        prefix: string,
        suffix?: string,
        token?: vscode.CancellationToken
    ): Promise<string | null> {
        // Check for cancellation
        if (token?.isCancellationRequested) {
            throw new MistralClientError('Request cancelled', 'CANCELLED');
        }

        // Check cache first if enabled
        if (this.config.cacheEnabled) {
            const cacheKey = this.generateCacheKey(prefix, suffix);
            const cached = this.cache.get(cacheKey);
            if (cached !== undefined) {
                return cached;
            }
        }

        const client = await this.getClient();

        // Check for cancellation after async operation
        if (token?.isCancellationRequested) {
            throw new MistralClientError('Request cancelled', 'CANCELLED');
        }

        const request: FIMCompletionRequest = {
            model: this.config.model,
            prompt: prefix,
            suffix: suffix || null,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            topP: 1,
            stop: this.getStopSequences(),
            stream: false,
        };

        try {
            const response: FIMCompletionResponse = await client.fim.complete(request);
            const content = this.extractContent(response.choices[0]?.message?.content || null);
            const result = content || null;

            // Cache the result if enabled and we got a result
            if (this.config.cacheEnabled && result !== null) {
                const cacheKey = this.generateCacheKey(prefix, suffix);
                this.cache.set(cacheKey, result, this.config.cacheTTL);
            }

            return result;
        } catch (error) {
            if (error instanceof MistralError) {
                console.error(`Mistral API Error [${error.statusCode}]: ${error.message}`);
                // Log additional details for validation errors
                if (error instanceof HTTPValidationError) {
                    console.error('Validation errors:', error.data$.detail);
                }
            }
            throw this.handleError(error);
        }
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
     * @returns Async generator yielding completion text chunks
     * @throws MistralClientError if the request fails
     */
    async *getStreamingCompletion(
        prefix: string,
        suffix?: string,
        token?: vscode.CancellationToken
    ): AsyncGenerator<string, void, unknown> {
        // Check for cancellation
        if (token?.isCancellationRequested) {
            throw new MistralClientError('Request cancelled', 'CANCELLED');
        }

        const client = await this.getClient();

        // Check for cancellation after async operation
        if (token?.isCancellationRequested) {
            throw new MistralClientError('Request cancelled', 'CANCELLED');
        }

        const request: FIMCompletionStreamRequest = {
            model: this.config.model,
            prompt: prefix,
            suffix: suffix || null,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            topP: 1,
            stop: this.getStopSequences(),
            stream: true,
        };

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
        } catch (error) {
            if (error instanceof MistralError) {
                console.error(`Mistral API Error [${error.statusCode}]: ${error.message}`);
                // Log additional details for validation errors
                if (error instanceof HTTPValidationError) {
                    console.error('Validation errors:', error.data$.detail);
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
                case 401:
                    return new MistralClientError(
                        'Invalid API key. Please check your Mistral API key.',
                        'INVALID_API_KEY',
                        error
                    );

                case 429:
                    return new MistralClientError(
                        'Rate limit exceeded. Please wait a moment and try again.',
                        'RATE_LIMIT',
                        error
                    );

                case 400:
                    return new MistralClientError(
                        'Bad request. Please check your configuration settings (model, maxTokens, etc.).',
                        'BAD_REQUEST',
                        error
                    );

                case 422:
                    return new MistralClientError(
                        `Validation error: ${errorMessage}`,
                        'VALIDATION_ERROR',
                        error
                    );

                case 500:
                case 502:
                case 503:
                case 504:
                    return new MistralClientError(
                        'Mistral API is temporarily unavailable. Please try again later.',
                        'SERVICE_UNAVAILABLE',
                        error
                    );

                default:
                    return new MistralClientError(
                        `API error (${statusCode}): ${errorMessage}`,
                        'API_ERROR',
                        error
                    );
            }
        }

        // Handle HTTP client errors (network, timeout, etc.)
        if (error instanceof ConnectionError) {
            return new MistralClientError(
                'Network error: Unable to connect to Mistral API. Please check your internet connection.',
                'NETWORK_ERROR',
                error
            );
        }

        if (error instanceof RequestTimeoutError) {
            return new MistralClientError(
                'Request timeout: The API request took too long. Please try again.',
                'TIMEOUT_ERROR',
                error
            );
        }

        if (error instanceof RequestAbortedError) {
            return new MistralClientError('Request was cancelled.', 'CANCELLED', error);
        }

        // Handle generic HTTP client errors
        if (error instanceof HTTPClientError) {
            const message = error instanceof Error ? error.message : String(error);
            return new MistralClientError(`Network error: ${message}`, 'NETWORK_ERROR', error);
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
                    error
                );
            }

            if (error.message.includes('timeout')) {
                return new MistralClientError(
                    'Request timeout: The API request took too long. Please try again.',
                    'TIMEOUT_ERROR',
                    error
                );
            }
        }

        if (error instanceof MistralClientError) {
            return error;
        }

        const message = error instanceof Error ? error.message : String(error);
        return new MistralClientError(`Unexpected error: ${message}`, 'UNEXPECTED_ERROR', error);
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
