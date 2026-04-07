import { describe, it, expect } from 'vitest';
import { checks } from '../src/checks/index.js';
import { makeProbeResult, makeConfig } from './helpers.js';
import type { ProbeResult, DetectorConfig, CheckResult } from '../src/types.js';

function runAllChecks(
  probe: ProbeResult,
  config: DetectorConfig,
): CheckResult[] {
  return checks.map((c) => c.run(probe, config));
}

function totalScore(results: CheckResult[]): number {
  const raw = results.reduce((sum, r) => sum + r.score, 0);
  return Math.max(0, Math.min(100, raw));
}

describe('Check Registry', () => {
  it('exports 5 checks', () => {
    expect(checks).toHaveLength(5);
    expect(
      checks.every(
        (c) => typeof c.name === 'string' && typeof c.run === 'function',
      ),
    ).toBe(true);
  });
});

describe('Scoring Parity', () => {
  const config = makeConfig();

  it('perfect Claude response scores ~100', () => {
    const probe = makeProbeResult({
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
    });

    const results = runAllChecks(probe, config);
    const byName = Object.fromEntries(results.map((r) => [r.name, r.score]));

    expect(byName['Knowledge Cutoff']).toBe(50);
    expect(byName['SSE Shape']).toBe(20);
    expect(byName['Thinking Block']).toBe(15);
    expect(byName['Usage Fields']).toBe(15);
    expect(byName['Identity']).toBe(0);
    expect(totalScore(results)).toBe(100);
  });

  it('competitor model (GPT) scores low, clamped to 0', () => {
    const probe = makeProbeResult({
      text: 'I am GPT-4, developed by OpenAI. My knowledge is from 2024.',
      eventTypes: ['message_start', 'content_block_delta'],
      declaredModel: 'gpt-4',
      hasThinkingBlock: false,
      hasThinkingDeltas: false,
      hasTextBlock: true,
      hasTextDeltas: true,
      usageSnapshots: [{ input_tokens: 50, output_tokens: 100 }],
    });

    const results = runAllChecks(probe, config);
    const byName = Object.fromEntries(results.map((r) => [r.name, r.score]));

    expect(byName['Knowledge Cutoff']).toBe(0);
    expect(byName['SSE Shape']).toBe(8);
    expect(byName['Thinking Block']).toBe(4);
    expect(byName['Usage Fields']).toBe(11);
    expect(byName['Identity']).toBe(-43);
    expect(totalScore(results)).toBe(0);
  });

  it('empty/error response scores zero', () => {
    const probe = makeProbeResult();
    const results = runAllChecks(probe, config);
    const byName = Object.fromEntries(results.map((r) => [r.name, r.score]));

    expect(byName['Knowledge Cutoff']).toBe(0);
    expect(byName['SSE Shape']).toBe(0);
    expect(byName['Thinking Block']).toBe(0);
    expect(byName['Usage Fields']).toBe(0);
    // Identity penalizes missing Claude/Anthropic (-8) and missing date (-8)
    expect(byName['Identity']).toBe(-16);
    expect(totalScore(results)).toBe(0);
  });

  it('early 2025 cutoff with partial SSE scores 64', () => {
    const probe = makeProbeResult({
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
    });

    const results = runAllChecks(probe, config);
    const byName = Object.fromEntries(results.map((r) => [r.name, r.score]));

    expect(byName['Knowledge Cutoff']).toBe(25);
    expect(byName['SSE Shape']).toBe(20);
    expect(byName['Thinking Block']).toBe(4);
    expect(byName['Usage Fields']).toBe(15);
    expect(byName['Identity']).toBe(0);
    expect(totalScore(results)).toBe(64);
  });

  it('negative total is clamped to 0', () => {
    const probe = makeProbeResult({
      text: 'I am GPT-4, developed by OpenAI.',
      declaredModel: 'gpt-4',
    });

    // Run identity check alone to verify the raw penalty
    const identityResult = checks
      .find((c) => c.name === 'Identity')!
      .run(probe, config);
    expect(identityResult.score).toBe(-51);

    // Full run: negative total clamped to 0
    const results = runAllChecks(probe, config);
    expect(totalScore(results)).toBe(0);
  });
});
