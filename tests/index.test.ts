import { describe, it, expect } from 'vitest';
import * as lib from '../src/index.js';

describe('Library exports', () => {
  it('exports all public API functions', () => {
    expect(typeof lib.runDetection).toBe('function');
    expect(typeof lib.runProbe).toBe('function');
    expect(typeof lib.getConfidence).toBe('function');
    expect(typeof lib.formatReport).toBe('function');
    expect(typeof lib.formatError).toBe('function');
    expect(typeof lib.maskApiKey).toBe('function');
  });

  it('exports check registry and individual checks', () => {
    expect(Array.isArray(lib.checks)).toBe(true);
    expect(lib.checks).toHaveLength(5);
    expect(typeof lib.knowledgeCutoffCheck.run).toBe('function');
    expect(typeof lib.sseShapeCheck.run).toBe('function');
    expect(typeof lib.thinkingBlockCheck.run).toBe('function');
    expect(typeof lib.usageFieldsCheck.run).toBe('function');
    expect(typeof lib.identityCheck.run).toBe('function');
  });
});
