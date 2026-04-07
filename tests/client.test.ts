import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeConfig } from './helpers.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn(() => ({
    messages: { create: mockCreate },
  }));
  return { default: MockAnthropic };
});

vi.mock('@anthropic-ai/sdk/error', () => {
  class APIError extends Error {
    status: number | undefined;
    constructor(status: number | undefined, message: string) {
      super(message);
      this.name = 'APIError';
      this.status = status;
    }
  }
  return { APIError };
});

import { APIError } from '@anthropic-ai/sdk/error';

function makeAsyncIterable<T>(items: T[]) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next(): Promise<IteratorResult<T>> {
          if (i < items.length) {
            return Promise.resolve({ value: items[i++], done: false });
          }
          return Promise.resolve({
            value: undefined as unknown as T,
            done: true,
          });
        },
      };
    },
  };
}

describe('runProbe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('populates ProbeResult from a standard event stream', async () => {
    const events = [
      {
        type: 'message_start',
        message: {
          model: 'claude-opus-4-6',
          usage: { input_tokens: 10, output_tokens: 0 },
        },
      },
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'thinking', thinking: '' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'thinking_delta', thinking: 'Let me think...' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'signature_delta', signature: 'sig123' },
      },
      { type: 'content_block_stop', index: 0 },
      {
        type: 'content_block_start',
        index: 1,
        content_block: { type: 'text', text: '' },
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'text_delta', text: 'I am Claude.' },
      },
      { type: 'content_block_stop', index: 1 },
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 42 },
      },
      { type: 'message_stop' },
    ];

    mockCreate.mockResolvedValue(makeAsyncIterable(events));

    const { runProbe } = await import('../src/client.js');
    const config = makeConfig();
    const result = await runProbe(config);

    expect(result.error).toBeNull();
    expect(result.declaredModel).toBe('claude-opus-4-6');
    expect(result.text).toBe('I am Claude.');
    expect(result.thinkingText).toBe('Let me think...');
    expect(result.hasThinkingBlock).toBe(true);
    expect(result.hasThinkingDeltas).toBe(true);
    expect(result.hasTextBlock).toBe(true);
    expect(result.hasTextDeltas).toBe(true);
    expect(result.hasSignatureDeltas).toBe(true);
    expect(result.emptySignatureDeltas).toBe(false);
    expect(result.stopReason).toBe('end_turn');
    expect(result.usageSnapshots).toHaveLength(2);
    expect(result.usageSnapshots[0]).toEqual({
      input_tokens: 10,
      output_tokens: 0,
    });
    expect(result.usageSnapshots[1]).toEqual({
      input_tokens: 0,
      output_tokens: 42,
    });
    expect(result.eventTypes).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_delta',
      'content_block_stop',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ]);
    expect(result.events).toHaveLength(10);
    expect(result.firstTokenLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns error with status 401 on AuthenticationError', async () => {
    mockCreate.mockImplementation(() => {
      throw new APIError(401, '401 Unauthorized');
    });

    const { runProbe } = await import('../src/client.js');
    const config = makeConfig();
    const result = await runProbe(config);

    expect(result.error).toContain('401');
  });

  it('returns error with status 429 on RateLimitError', async () => {
    mockCreate.mockImplementation(() => {
      throw new APIError(429, '429 Rate limited');
    });

    const { runProbe } = await import('../src/client.js');
    const config = makeConfig();
    const result = await runProbe(config);

    expect(result.error).toContain('429');
  });

  it('detects empty signature deltas', async () => {
    const events = [
      {
        type: 'message_start',
        message: { model: 'claude-opus-4-6', usage: { input_tokens: 10, output_tokens: 0 } },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'signature_delta', signature: '' },
      },
      { type: 'message_stop' },
    ];

    mockCreate.mockResolvedValue(makeAsyncIterable(events));

    const { runProbe } = await import('../src/client.js');
    const result = await runProbe(makeConfig());

    expect(result.hasSignatureDeltas).toBe(true);
    expect(result.emptySignatureDeltas).toBe(true);
  });

  it('returns error message for generic Error', async () => {
    mockCreate.mockImplementation(() => {
      throw new Error('Network failure');
    });

    const { runProbe } = await import('../src/client.js');
    const result = await runProbe(makeConfig());

    expect(result.error).toBe('Network failure');
  });

  it('returns stringified error for non-Error throws', async () => {
    mockCreate.mockImplementation(() => {
      throw 'unexpected string error';
    });

    const { runProbe } = await import('../src/client.js');
    const result = await runProbe(makeConfig());

    expect(result.error).toBe('unexpected string error');
  });

  it('returns timeout error when stream is aborted', async () => {
    mockCreate.mockImplementation(
      (_params: unknown, options?: { signal?: AbortSignal }) => {
        return Promise.resolve({
          [Symbol.asyncIterator]() {
            return {
              next(): Promise<IteratorResult<unknown>> {
                return new Promise((_, reject) => {
                  if (options?.signal) {
                    options.signal.addEventListener('abort', () => {
                      const err = new Error('The operation was aborted');
                      err.name = 'AbortError';
                      reject(err);
                    });
                  }
                });
              },
            };
          },
        });
      },
    );

    const { runProbe } = await import('../src/client.js');
    const config = makeConfig({ timeout: 50 });
    const result = await runProbe(config);

    expect(result.error).toContain('Timeout');
    expect(result.error).toContain('50ms');
  });
});
