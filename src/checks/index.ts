import type { AuthenticityCheck } from '../types.js';

export { knowledgeCutoffCheck } from './knowledge-cutoff.js';
export { sseShapeCheck } from './sse-shape.js';
export { thinkingBlockCheck } from './thinking-block.js';
export { usageFieldsCheck } from './usage-fields.js';
export { identityCheck } from './identity.js';

import { knowledgeCutoffCheck } from './knowledge-cutoff.js';
import { sseShapeCheck } from './sse-shape.js';
import { thinkingBlockCheck } from './thinking-block.js';
import { usageFieldsCheck } from './usage-fields.js';
import { identityCheck } from './identity.js';

export const checks: AuthenticityCheck[] = [
  knowledgeCutoffCheck,
  sseShapeCheck,
  thinkingBlockCheck,
  usageFieldsCheck,
  identityCheck,
];
