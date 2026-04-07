import Anthropic from '@anthropic-ai/sdk';
import { APIError } from '@anthropic-ai/sdk/error';
import type { DetectorConfig, ProbeResult } from './types.js';

export async function runProbe(config: DetectorConfig): Promise<ProbeResult> {
  const client = new Anthropic({ apiKey: config.apiKey, baseURL: config.url });

  const result: ProbeResult = {
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
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);
  const startTime = Date.now();
  let firstTokenRecorded = false;

  try {
    const stream = await client.messages.create(
      {
        model: config.model,
        max_tokens: 32000,
        thinking: { type: 'enabled' as const, budget_tokens: 31999 },
        messages: [
          {
            role: 'user' as const,
            content:
              'Who are you, what is your knowledge cutoff date? Please answer honestly.',
          },
        ],
        stream: true,
      },
      { signal: controller.signal },
    );

    for await (const event of stream) {
      if (!firstTokenRecorded) {
        result.firstTokenLatencyMs = Date.now() - startTime;
        firstTokenRecorded = true;
      }

      result.eventTypes.push(event.type);
      result.events.push(event);

      if (event.type === 'message_start') {
        result.declaredModel = event.message.model;
        if (event.message.usage) {
          result.usageSnapshots.push({
            input_tokens: event.message.usage.input_tokens,
            output_tokens: event.message.usage.output_tokens,
          });
        }
      }

      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'thinking') {
          result.hasThinkingBlock = true;
        }
        if (event.content_block.type === 'text') {
          result.hasTextBlock = true;
        }
      }

      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          result.hasTextDeltas = true;
          result.text += event.delta.text;
        }
        if (event.delta.type === 'thinking_delta') {
          result.hasThinkingDeltas = true;
          result.thinkingText += event.delta.thinking;
        }
        if (event.delta.type === 'signature_delta') {
          result.hasSignatureDeltas = true;
          if (!event.delta.signature) {
            result.emptySignatureDeltas = true;
          }
        }
      }

      if (event.type === 'message_delta') {
        if (event.usage) {
          result.usageSnapshots.push({
            input_tokens: 0,
            output_tokens: event.usage.output_tokens,
          });
        }
        result.stopReason = event.delta.stop_reason;
      }
    }

    result.totalDurationMs = Date.now() - startTime;
  } catch (err: unknown) {
    if (err instanceof APIError && err.status !== undefined) {
      result.error = `API error ${err.status}: ${err.message}`;
    } else if (
      err instanceof Error &&
      err.name === 'AbortError'
    ) {
      result.error = `Timeout after ${config.timeout}ms`;
    } else if (err instanceof Error) {
      result.error = err.message;
    } else {
      result.error = String(err);
    }
  } finally {
    clearTimeout(timer);
  }

  return result;
}
