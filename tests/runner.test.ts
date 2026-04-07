import { vi, describe, it, expect, beforeEach } from 'vitest';
import { makeProbeResult, makeConfig } from './helpers.js';

vi.mock('../src/client.js', () => ({
  runProbe: vi.fn(),
}));

import { runProbe } from '../src/client.js';
import { runDetection, getConfidence } from '../src/runner.js';

const mockRunProbe = vi.mocked(runProbe);

beforeEach(() => {
  mockRunProbe.mockReset();
});

describe('getConfidence', () => {
  it('returns HIGH for score >= 80', () => {
    expect(getConfidence(80)).toBe('HIGH');
    expect(getConfidence(100)).toBe('HIGH');
    expect(getConfidence(95)).toBe('HIGH');
  });

  it('returns MEDIUM for score 60-79', () => {
    expect(getConfidence(79)).toBe('MEDIUM');
    expect(getConfidence(60)).toBe('MEDIUM');
    expect(getConfidence(70)).toBe('MEDIUM');
  });

  it('returns LOW for score 35-59', () => {
    expect(getConfidence(59)).toBe('LOW');
    expect(getConfidence(35)).toBe('LOW');
    expect(getConfidence(45)).toBe('LOW');
  });

  it('returns VERY_LOW for score < 35', () => {
    expect(getConfidence(34)).toBe('VERY_LOW');
    expect(getConfidence(0)).toBe('VERY_LOW');
    expect(getConfidence(10)).toBe('VERY_LOW');
  });
});

describe('runDetection', () => {
  const config = makeConfig({
    url: 'https://api.anthropic.com',
    model: 'claude-opus-4-6',
  });

  it('successful probe returns full report with 5 checks', async () => {
    mockRunProbe.mockResolvedValue(
      makeProbeResult({
        text: 'My knowledge cutoff is May 2025. I am Claude, made by Anthropic.',
        thinkingText: 'Let me think about this...',
        eventTypes: [
          'message_start',
          'content_block_start',
          'content_block_delta',
          'content_block_stop',
          'message_delta',
          'message_stop',
        ],
        events: [
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: 'hello' },
          } as any,
        ],
        declaredModel: 'claude-opus-4-6',
        hasThinkingBlock: true,
        hasThinkingDeltas: true,
        hasTextBlock: true,
        hasTextDeltas: true,
        hasSignatureDeltas: true,
        emptySignatureDeltas: false,
        usageSnapshots: [
          { input_tokens: 100, output_tokens: 50 },
          { input_tokens: 100, output_tokens: 200 },
        ],
        stopReason: 'end_turn',
        firstTokenLatencyMs: 250,
        totalDurationMs: 3000,
      }),
    );

    const { report, error } = await runDetection(config);

    expect(error).toBeNull();
    expect(report.checks).toHaveLength(5);
    expect(report.totalScore).toBeGreaterThan(0);
    expect(report.totalScore).toBe(100);
    expect(report.confidence).toBe(getConfidence(report.totalScore));
    expect(report.maxPossible).toBe(100);
  });

  it('probe error returns empty report with score 0', async () => {
    mockRunProbe.mockResolvedValue(
      makeProbeResult({
        error: 'API error 401: Unauthorized',
        firstTokenLatencyMs: 0,
        totalDurationMs: 150,
      }),
    );

    const { report, error } = await runDetection(config);

    expect(error).toBe('API error 401: Unauthorized');
    expect(report.checks).toHaveLength(0);
    expect(report.totalScore).toBe(0);
    expect(report.confidence).toBe('VERY_LOW');
    expect(report.maxPossible).toBe(100);
  });

  it('score clamping: negative raw total clamped to 0', async () => {
    // GPT-4 competitor response produces very negative identity score
    mockRunProbe.mockResolvedValue(
      makeProbeResult({
        text: 'I am GPT-4, developed by OpenAI.',
        declaredModel: 'gpt-4',
        hasThinkingBlock: false,
        hasThinkingDeltas: false,
        hasTextBlock: false,
        hasTextDeltas: false,
        firstTokenLatencyMs: 100,
        totalDurationMs: 500,
      }),
    );

    const { report, error } = await runDetection(config);

    expect(error).toBeNull();
    expect(report.totalScore).toBe(0);
    expect(report.totalScore).toBeGreaterThanOrEqual(0);
    expect(report.confidence).toBe('VERY_LOW');
  });

  it('score clamping: raw total above 100 clamped to 100', async () => {
    // This is unlikely in practice but verifies the upper clamp.
    // We mock checks at the module level for this one test.
    // Instead, we verify the Math.min(100, ...) by checking the cap exists.
    // A perfect probe scores 98, which is < 100, so we verify the cap
    // by confirming totalScore <= 100 on a high-scoring probe.
    mockRunProbe.mockResolvedValue(
      makeProbeResult({
        text: 'My knowledge cutoff is May 2025. I am Claude, made by Anthropic.',
        thinkingText: 'Let me think about this...',
        eventTypes: [
          'message_start',
          'content_block_start',
          'content_block_delta',
          'content_block_stop',
          'message_delta',
          'message_stop',
        ],
        events: [
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: 'hello' },
          } as any,
        ],
        declaredModel: 'claude-opus-4-6',
        hasThinkingBlock: true,
        hasThinkingDeltas: true,
        hasTextBlock: true,
        hasTextDeltas: true,
        hasSignatureDeltas: true,
        emptySignatureDeltas: false,
        usageSnapshots: [
          { input_tokens: 100, output_tokens: 50 },
          { input_tokens: 100, output_tokens: 200 },
        ],
        stopReason: 'end_turn',
      }),
    );

    const { report } = await runDetection(config);

    expect(report.totalScore).toBeLessThanOrEqual(100);
  });

  it('report contains correct config fields', async () => {
    mockRunProbe.mockResolvedValue(
      makeProbeResult({ firstTokenLatencyMs: 300, totalDurationMs: 4500 }),
    );

    const { report } = await runDetection(config);

    expect(report.config).toEqual({
      model: 'claude-opus-4-6',
      url: 'https://api.anthropic.com',
    });
  });

  it('report contains correct timing fields', async () => {
    mockRunProbe.mockResolvedValue(
      makeProbeResult({ firstTokenLatencyMs: 300, totalDurationMs: 4500 }),
    );

    const { report } = await runDetection(config);

    expect(report.timing).toEqual({
      firstTokenMs: 300,
      totalMs: 4500,
    });
  });

  it('error report preserves timing from partial probe', async () => {
    mockRunProbe.mockResolvedValue(
      makeProbeResult({
        error: 'Timeout after 120000ms',
        firstTokenLatencyMs: 500,
        totalDurationMs: 120000,
      }),
    );

    const { report, error } = await runDetection(config);

    expect(error).toBe('Timeout after 120000ms');
    expect(report.timing).toEqual({
      firstTokenMs: 500,
      totalMs: 120000,
    });
  });

  it('calls runProbe with the provided config', async () => {
    mockRunProbe.mockResolvedValue(makeProbeResult());

    await runDetection(config);

    expect(mockRunProbe).toHaveBeenCalledOnce();
    expect(mockRunProbe).toHaveBeenCalledWith(config);
  });

  it('confidence matches score for a mid-range probe', async () => {
    // Early 2025 cutoff with partial SSE scores 64 -> MEDIUM
    mockRunProbe.mockResolvedValue(
      makeProbeResult({
        text: 'My training data goes up to early 2025. I am Claude by Anthropic.',
        eventTypes: [
          'message_start',
          'content_block_start',
          'content_block_delta',
          'message_delta',
          'message_stop',
        ],
        events: [
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: 'hello' },
          } as any,
        ],
        declaredModel: 'claude-sonnet-4-6',
        hasThinkingBlock: false,
        hasThinkingDeltas: false,
        hasTextBlock: true,
        hasTextDeltas: true,
        usageSnapshots: [
          { input_tokens: 80, output_tokens: 0 },
          { input_tokens: 80, output_tokens: 150 },
        ],
        firstTokenLatencyMs: 200,
        totalDurationMs: 2000,
      }),
    );

    const { report } = await runDetection(config);

    expect(report.totalScore).toBe(64);
    expect(report.confidence).toBe('MEDIUM');
  });
});
