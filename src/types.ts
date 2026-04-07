import type { RawMessageStreamEvent } from '@anthropic-ai/sdk/resources/messages/messages.js';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

export interface DetectorConfig {
  url: string;
  apiKey: string;
  model: string;
  timeout: number; // ms, default 120000
  verbose: boolean;
}

export interface ProbeResult {
  events: RawMessageStreamEvent[];
  eventTypes: string[];
  text: string;
  thinkingText: string;
  declaredModel: string | null;
  usageSnapshots: Array<{ input_tokens: number; output_tokens: number }>;
  hasThinkingBlock: boolean;
  hasThinkingDeltas: boolean;
  hasTextBlock: boolean;
  hasTextDeltas: boolean;
  hasSignatureDeltas: boolean;
  emptySignatureDeltas: boolean;
  stopReason: string | null;
  firstTokenLatencyMs: number;
  totalDurationMs: number;
  error: string | null;
}

export interface ScoreItem {
  label: string;
  points: number;
  maxPoints: number;
  evidence: string;
}

export interface CheckResult {
  name: string;
  score: number;
  maxScore: number;
  items: ScoreItem[];
  status: 'pass' | 'warn' | 'fail';
}

export interface AuthenticityCheck {
  name: string;
  run(probe: ProbeResult, config: DetectorConfig): CheckResult;
}

export interface DetectorReport {
  totalScore: number;
  maxPossible: number;
  confidence: Confidence;
  checks: CheckResult[];
  config: { model: string; url: string };
  timing: { firstTokenMs: number; totalMs: number };
}
