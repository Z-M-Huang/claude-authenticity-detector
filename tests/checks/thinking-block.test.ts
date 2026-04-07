import { describe, it, expect } from 'vitest';
import { thinkingBlockCheck } from '../../src/checks/thinking-block.js';
import { makeProbeResult, makeConfig } from '../helpers.js';

const config = makeConfig();

describe('thinkingBlockCheck', () => {
  it('scores 13 without signature deltas (no signature bonus)', () => {
    const probe = makeProbeResult({
      hasThinkingBlock: true,
      hasThinkingDeltas: true,
      hasTextBlock: true,
      hasTextDeltas: true,
      hasSignatureDeltas: false,
      emptySignatureDeltas: false,
    });
    const result = thinkingBlockCheck.run(probe, config);
    // 4 + 5 + 4 + 0 (no sig) = 13
    expect(result.score).toBe(13);
    expect(result.maxScore).toBe(15);
    expect(result.status).toBe('pass');
    expect(result.name).toBe('Thinking Block');
  });

  it('scores 15 with valid non-empty signature deltas', () => {
    const probe = makeProbeResult({
      hasThinkingBlock: true,
      hasThinkingDeltas: true,
      hasTextBlock: true,
      hasTextDeltas: true,
      hasSignatureDeltas: true,
      emptySignatureDeltas: false,
    });
    const result = thinkingBlockCheck.run(probe, config);
    // 4 + 5 + 4 + 2 (sig bonus) = 15
    expect(result.score).toBe(15);
    expect(result.status).toBe('pass');
  });

  it('scores 0 when no thinking block at all', () => {
    const probe = makeProbeResult({
      hasThinkingBlock: false,
      hasThinkingDeltas: false,
      hasTextBlock: false,
      hasTextDeltas: false,
      emptySignatureDeltas: false,
    });
    const result = thinkingBlockCheck.run(probe, config);
    expect(result.score).toBe(0);
    expect(result.status).toBe('fail');
  });

  it('scores 9 when thinking block present but empty signature deltas', () => {
    const probe = makeProbeResult({
      hasThinkingBlock: true,
      hasThinkingDeltas: true,
      hasTextBlock: true,
      hasTextDeltas: true,
      hasSignatureDeltas: true,
      emptySignatureDeltas: true,
    });
    const result = thinkingBlockCheck.run(probe, config);
    // 4 + 5 + 4 + 0 (sig empty, no bonus) - 4 (penalty) = 9
    expect(result.score).toBe(9);
    expect(result.status).toBe('warn');
  });

  it('scores 9 when thinking + deltas but no text block', () => {
    const probe = makeProbeResult({
      hasThinkingBlock: true,
      hasThinkingDeltas: true,
      hasTextBlock: false,
      hasTextDeltas: false,
      emptySignatureDeltas: false,
    });
    const result = thinkingBlockCheck.run(probe, config);
    // 4 + 5 + 0 = 9
    expect(result.score).toBe(9);
    expect(result.status).toBe('warn');
  });

  it('scores 4 when only text block + text deltas', () => {
    const probe = makeProbeResult({
      hasThinkingBlock: false,
      hasThinkingDeltas: false,
      hasTextBlock: true,
      hasTextDeltas: true,
      emptySignatureDeltas: false,
    });
    const result = thinkingBlockCheck.run(probe, config);
    // 0 + 0 + 4 = 4
    expect(result.score).toBe(4);
    expect(result.status).toBe('fail');
  });
});
