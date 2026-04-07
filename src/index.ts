// Main API
export { runDetection } from './runner.js';
export { runProbe } from './client.js';
export { getConfidence } from './runner.js';

// Checks
export { checks, knowledgeCutoffCheck, sseShapeCheck, thinkingBlockCheck, usageFieldsCheck, identityCheck } from './checks/index.js';

// Output
export { formatReport, formatError, maskApiKey } from './output.js';

// Types
export type {
  Confidence,
  DetectorConfig,
  ProbeResult,
  ScoreItem,
  CheckResult,
  AuthenticityCheck,
  DetectorReport,
} from './types.js';
