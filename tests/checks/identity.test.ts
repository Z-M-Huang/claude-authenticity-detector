import { describe, it, expect } from 'vitest';
import { identityCheck } from '../../src/checks/identity.js';
import { makeProbeResult, makeConfig } from '../helpers.js';

const config = makeConfig();

describe('identityCheck', () => {
  it('scores 0 for correct Claude identity with cutoff date', () => {
    const probe = makeProbeResult({
      text: 'I am Claude, by Anthropic. Knowledge cutoff May 2025',
      declaredModel: 'claude-opus-4-6',
    });
    const result = identityCheck.run(probe, config);
    expect(result.score).toBe(0);
    expect(result.status).toBe('pass');
  });

  it('scores -33 for competitor self-ID "I am GPT-4 by OpenAI"', () => {
    const probe = makeProbeResult({
      text: 'I am GPT-4 by OpenAI',
    });
    const result = identityCheck.run(probe, config);
    // -25 (competitor) + -8 (missing identity) + -8 (missing cutoff) = -41
    expect(result.score).toBe(-41);
    expect(result.status).toBe('fail');
  });

  it('scores -16 for generic AI with no identity or date', () => {
    const probe = makeProbeResult({
      text: 'I am an AI assistant',
    });
    const result = identityCheck.run(probe, config);
    // -8 (missing identity) + -8 (missing cutoff) = -16
    expect(result.score).toBe(-16);
    expect(result.status).toBe('fail');
  });

  it('scores -10 for declaredModel mismatch with correct text identity', () => {
    const probe = makeProbeResult({
      declaredModel: 'gpt-4',
      text: 'I am Claude, by Anthropic. Knowledge cutoff May 2025',
    });
    const result = identityCheck.run(probe, config);
    expect(result.score).toBe(-10);
    expect(result.status).toBe('warn');
  });

  it('scores 0 when competitor name appears with negation', () => {
    const probe = makeProbeResult({
      text: 'I am not GPT, I am Claude. May 2025',
    });
    const result = identityCheck.run(probe, config);
    expect(result.score).toBe(0);
    expect(result.status).toBe('pass');
  });

  it('scores -16 for empty text with no declaredModel', () => {
    const probe = makeProbeResult({
      text: '',
      declaredModel: null,
    });
    const result = identityCheck.run(probe, config);
    // -8 (missing identity) + -8 (missing cutoff) = -16
    expect(result.score).toBe(-16);
    expect(result.status).toBe('fail');
  });

  it('applies no model penalty when declaredModel is null', () => {
    const probe = makeProbeResult({
      text: 'I am Claude, by Anthropic. May 2025',
      declaredModel: null,
    });
    const result = identityCheck.run(probe, config);
    expect(result.score).toBe(0);
    expect(result.status).toBe('pass');
  });
});
