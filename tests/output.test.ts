import { describe, it, expect } from 'vitest';
import { formatReport, formatError, maskApiKey } from '../src/output.js';
import { makeConfig, makeCheckResult } from './helpers.js';
import type { DetectorReport } from '../src/types.js';

describe('maskApiKey', () => {
  it('masks a long key showing first 4 and last 4 chars', () => {
    expect(maskApiKey('sk-proj-abcdef1234567890')).toBe('sk-p...7890');
  });

  it('returns **** for short keys', () => {
    expect(maskApiKey('short')).toBe('****');
  });
});

describe('formatReport', () => {
  const config = makeConfig();

  function makeMockReport(overrides?: Partial<DetectorReport>): DetectorReport {
    return {
      totalScore: 75,
      maxPossible: 100,
      confidence: 'HIGH',
      checks: [
        makeCheckResult({
          name: 'thinking-block',
          score: 20,
          maxScore: 25,
          status: 'pass',
          items: [
            { label: 'Has thinking block', points: 10, maxPoints: 10, evidence: 'Block detected' },
            { label: 'Has thinking deltas', points: 10, maxPoints: 10, evidence: 'Deltas found' },
            { label: 'Signature present', points: 0, maxPoints: 5, evidence: 'No signature' },
          ],
        }),
        makeCheckResult({
          name: 'knowledge-cutoff',
          score: 50,
          maxScore: 50,
          status: 'pass',
          items: [
            { label: 'Mentions May 2025', points: 50, maxPoints: 50, evidence: 'Found "May 2025"' },
          ],
        }),
      ],
      config: { model: 'claude-opus-4-6', url: 'https://api.anthropic.com' },
      timing: { firstTokenMs: 1200, totalMs: 5400 },
      ...overrides,
    };
  }

  it('contains check names and scores', () => {
    const report = makeMockReport();
    const output = formatReport(report, config);
    expect(output).toContain('thinking-block');
    expect(output).toContain('knowledge-cutoff');
    expect(output).toContain('20 / 25');
    expect(output).toContain('50 / 50');
  });

  it('contains TOTAL and confidence level', () => {
    const report = makeMockReport();
    const output = formatReport(report, config);
    expect(output).toContain('TOTAL: 75 / 100');
    expect(output).toContain('HIGH');
  });

  it('contains box-drawing characters', () => {
    const report = makeMockReport();
    const output = formatReport(report, config);
    expect(output).toContain('═');
    expect(output).toContain('║');
    expect(output).toContain('╔');
    expect(output).toContain('╗');
    expect(output).toContain('╚');
    expect(output).toContain('╝');
  });

  it('renders warn and fail status checks', () => {
    const report = makeMockReport({
      checks: [
        makeCheckResult({ name: 'sse-shape', score: 10, maxScore: 20, status: 'warn', items: [] }),
        makeCheckResult({ name: 'identity', score: -8, maxScore: 0, status: 'fail', items: [{ label: 'Missing identity', points: -8, maxPoints: 0, evidence: 'no mention' }] }),
      ],
    });
    const output = formatReport(report, config);
    expect(output).toContain('sse-shape');
    expect(output).toContain('identity');
    expect(output).toContain('10 / 20');
    expect(output).toContain('-8 / 0');
  });

  it('handles very long check names and content without breaking', () => {
    const report = makeMockReport({
      checks: [
        makeCheckResult({
          name: 'a-very-long-check-name-that-exceeds-normal-width-boundaries',
          score: 10,
          maxScore: 20,
          status: 'pass',
          items: [],
        }),
      ],
      config: { model: 'claude-opus-4-6', url: 'https://a-very-long-url-that-will-make-the-box-line-content-exceed-the-normal-box-width-of-62-characters.example.com' },
    });
    const output = formatReport(report, config);
    expect(output).toContain('a-very-long-check-name');
  });

  it('renders MEDIUM and LOW confidence', () => {
    const medium = makeMockReport({ confidence: 'MEDIUM', totalScore: 65 });
    const medOutput = formatReport(medium, config);
    expect(medOutput).toContain('MEDIUM');

    const low = makeMockReport({ confidence: 'VERY_LOW', totalScore: 20 });
    const lowOutput = formatReport(low, config);
    expect(lowOutput).toContain('VERY_LOW');
  });
});

describe('formatError', () => {
  it('contains the error message', () => {
    const output = formatError('test');
    expect(output).toContain('Error: test');
  });
});
