import { describe, it, expect } from 'vitest';
import { knowledgeCutoffCheck } from '../../src/checks/knowledge-cutoff.js';
import { makeProbeResult, makeConfig } from '../helpers.js';

const config = makeConfig();

describe('knowledgeCutoffCheck', () => {
  it('scores 50 for "My knowledge cutoff is May 2025"', () => {
    const probe = makeProbeResult({ text: 'My knowledge cutoff is May 2025' });
    const result = knowledgeCutoffCheck.run(probe, config);
    expect(result.score).toBe(50);
    expect(result.status).toBe('pass');
  });

  it('scores 50 for "2025年5月"', () => {
    const probe = makeProbeResult({ text: '2025年5月' });
    const result = knowledgeCutoffCheck.run(probe, config);
    expect(result.score).toBe(50);
    expect(result.status).toBe('pass');
  });

  it('scores 25 for "training data through early 2025"', () => {
    const probe = makeProbeResult({ text: 'training data through early 2025' });
    const result = knowledgeCutoffCheck.run(probe, config);
    expect(result.score).toBe(25);
    expect(result.status).toBe('warn');
  });

  it('scores 10 for "knowledge cutoff January 2025"', () => {
    const probe = makeProbeResult({ text: 'knowledge cutoff January 2025' });
    const result = knowledgeCutoffCheck.run(probe, config);
    expect(result.score).toBe(10);
    expect(result.status).toBe('fail');
  });

  it('scores 0 for "data up to April 2024"', () => {
    const probe = makeProbeResult({ text: 'data up to April 2024' });
    const result = knowledgeCutoffCheck.run(probe, config);
    expect(result.score).toBe(0);
    expect(result.status).toBe('fail');
  });

  it('scores 0 for "I don\'t have a cutoff date"', () => {
    const probe = makeProbeResult({ text: "I don't have a cutoff date" });
    const result = knowledgeCutoffCheck.run(probe, config);
    expect(result.score).toBe(0);
    expect(result.status).toBe('fail');
  });

  it('scores 50 (highest tier) for "early 2025, specifically May 2025"', () => {
    const probe = makeProbeResult({
      text: 'early 2025, specifically May 2025',
    });
    const result = knowledgeCutoffCheck.run(probe, config);
    expect(result.score).toBe(50);
    expect(result.status).toBe('pass');
  });

  it('scores 0 for empty text', () => {
    const probe = makeProbeResult({ text: '' });
    const result = knowledgeCutoffCheck.run(probe, config);
    expect(result.score).toBe(0);
    expect(result.status).toBe('fail');
  });
});
