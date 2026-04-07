import { describe, it, expect } from 'vitest';
import { sseShapeCheck } from '../../src/checks/sse-shape.js';
import { makeProbeResult, makeConfig } from '../helpers.js';

const config = makeConfig();

describe('sseShapeCheck', () => {
  it('scores 20 with all 6 canonical events + text_delta', () => {
    const probe = makeProbeResult({
      eventTypes: [
        'message_start',
        'content_block_start',
        'content_block_delta',
        'content_block_stop',
        'message_delta',
        'message_stop',
      ],
      events: [
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hi' } },
      ] as any,
    });

    const result = sseShapeCheck.run(probe, config);
    expect(result.score).toBe(20);
    expect(result.maxScore).toBe(20);
    expect(result.status).toBe('pass');
  });

  it('scores 16 when missing message_start', () => {
    const probe = makeProbeResult({
      eventTypes: [
        'content_block_start',
        'content_block_delta',
        'content_block_stop',
        'message_delta',
        'message_stop',
      ],
      events: [
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hi' } },
      ] as any,
    });

    const result = sseShapeCheck.run(probe, config);
    expect(result.score).toBe(16);
    expect(result.status).toBe('pass');
  });

  it('scores 6 with only message_start + message_stop', () => {
    const probe = makeProbeResult({
      eventTypes: ['message_start', 'message_stop'],
      events: [],
    });

    const result = sseShapeCheck.run(probe, config);
    expect(result.score).toBe(6);
    expect(result.status).toBe('fail');
  });

  it('scores 0 with empty events', () => {
    const probe = makeProbeResult({
      eventTypes: [],
      events: [],
    });

    const result = sseShapeCheck.run(probe, config);
    expect(result.score).toBe(0);
    expect(result.status).toBe('fail');
  });

  it('scores 14 with all events + 4 unknown types (penalty capped at -6)', () => {
    const probe = makeProbeResult({
      eventTypes: [
        'message_start',
        'content_block_start',
        'content_block_delta',
        'content_block_stop',
        'message_delta',
        'message_stop',
        'unknown_a',
        'unknown_b',
        'unknown_c',
        'unknown_d',
      ],
      events: [
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hi' } },
      ] as any,
    });

    const result = sseShapeCheck.run(probe, config);
    // 4+4+4+4+2+2 = 20, minus 6 (capped) = 14
    expect(result.score).toBe(14);
    expect(result.status).toBe('warn');
  });
});
