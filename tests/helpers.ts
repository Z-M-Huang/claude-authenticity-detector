import type { ProbeResult, DetectorConfig, CheckResult } from '../src/types.js';

export function makeProbeResult(overrides?: Partial<ProbeResult>): ProbeResult {
  return {
    events: [],
    eventTypes: [],
    text: '',
    thinkingText: '',
    declaredModel: null,
    usageSnapshots: [],
    hasThinkingBlock: false,
    hasThinkingDeltas: false,
    hasTextBlock: false,
    hasTextDeltas: false,
    hasSignatureDeltas: false,
    emptySignatureDeltas: false,
    stopReason: null,
    firstTokenLatencyMs: 0,
    totalDurationMs: 0,
    error: null,
    ...overrides,
  };
}

export function makeConfig(overrides?: Partial<DetectorConfig>): DetectorConfig {
  return {
    url: 'https://api.example.com',
    apiKey: process.env.ANTHROPIC_API_KEY ?? 'test-placeholder',
    model: 'claude-opus-4-6',
    timeout: 120000,
    verbose: false,
    ...overrides,
  };
}

export function makeCheckResult(overrides?: Partial<CheckResult>): CheckResult {
  return {
    name: 'test-check',
    score: 0,
    maxScore: 10,
    items: [],
    status: 'pass',
    ...overrides,
  };
}
