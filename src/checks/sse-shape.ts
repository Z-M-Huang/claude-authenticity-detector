import type { AuthenticityCheck, ProbeResult, DetectorConfig, CheckResult, ScoreItem } from '../types.js';

const CANONICAL_EVENT_TYPES = new Set([
  'message_start',
  'content_block_start',
  'content_block_delta',
  'content_block_stop',
  'message_delta',
  'message_stop',
]);

export const sseShapeCheck: AuthenticityCheck = {
  name: 'SSE Shape',

  run(probe: ProbeResult, _config: DetectorConfig): CheckResult {
    const items: ScoreItem[] = [];
    let rawScore = 0;

    // +4 for message_start
    const hasMessageStart = probe.eventTypes.includes('message_start');
    items.push({
      label: 'message_start event',
      points: hasMessageStart ? 4 : 0,
      maxPoints: 4,
      evidence: hasMessageStart ? 'present' : 'missing',
    });
    if (hasMessageStart) rawScore += 4;

    // +4 for content_block_start
    const hasContentBlockStart = probe.eventTypes.includes('content_block_start');
    items.push({
      label: 'content_block_start event',
      points: hasContentBlockStart ? 4 : 0,
      maxPoints: 4,
      evidence: hasContentBlockStart ? 'present' : 'missing',
    });
    if (hasContentBlockStart) rawScore += 4;

    // +4 for content_block_delta
    const hasContentBlockDelta = probe.eventTypes.includes('content_block_delta');
    items.push({
      label: 'content_block_delta event',
      points: hasContentBlockDelta ? 4 : 0,
      maxPoints: 4,
      evidence: hasContentBlockDelta ? 'present' : 'missing',
    });
    if (hasContentBlockDelta) rawScore += 4;

    // +4 for message_delta
    const hasMessageDelta = probe.eventTypes.includes('message_delta');
    items.push({
      label: 'message_delta event',
      points: hasMessageDelta ? 4 : 0,
      maxPoints: 4,
      evidence: hasMessageDelta ? 'present' : 'missing',
    });
    if (hasMessageDelta) rawScore += 4;

    // +2 for message_stop
    const hasMessageStop = probe.eventTypes.includes('message_stop');
    items.push({
      label: 'message_stop event',
      points: hasMessageStop ? 2 : 0,
      maxPoints: 2,
      evidence: hasMessageStop ? 'present' : 'missing',
    });
    if (hasMessageStop) rawScore += 2;

    // +2 for text_delta in content_block_delta events
    const hasTextDelta = probe.events.some(
      (event) =>
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta',
    );
    items.push({
      label: 'text_delta in content_block_delta',
      points: hasTextDelta ? 2 : 0,
      maxPoints: 2,
      evidence: hasTextDelta ? 'present' : 'missing',
    });
    if (hasTextDelta) rawScore += 2;

    // -2 each for unknown event types, max -6
    const unknownTypes = probe.eventTypes.filter((t) => !CANONICAL_EVENT_TYPES.has(t));
    const unknownPenalty = Math.min(unknownTypes.length * 2, 6);
    if (unknownTypes.length > 0) {
      items.push({
        label: 'unknown event types',
        points: -unknownPenalty,
        maxPoints: 0,
        evidence: unknownTypes.join(', '),
      });
      rawScore -= unknownPenalty;
    }

    const score = Math.max(0, Math.min(20, rawScore));
    const status = score >= 16 ? 'pass' : score >= 9 ? 'warn' : 'fail';

    return {
      name: this.name,
      score,
      maxScore: 20,
      items,
      status,
    };
  },
};
