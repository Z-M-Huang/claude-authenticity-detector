import { runProbe } from './client.js';
import { checks } from './checks/index.js';
import type { DetectorConfig, DetectorReport, Confidence } from './types.js';

export function getConfidence(score: number): Confidence {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 35) return 'LOW';
  return 'VERY_LOW';
}

export async function runDetection(
  config: DetectorConfig,
): Promise<{ report: DetectorReport; error: string | null }> {
  const probe = await runProbe(config);

  if (probe.error) {
    return {
      report: {
        totalScore: 0,
        maxPossible: 100,
        confidence: 'VERY_LOW',
        checks: [],
        config: { model: config.model, url: config.url },
        timing: {
          firstTokenMs: probe.firstTokenLatencyMs,
          totalMs: probe.totalDurationMs,
        },
      },
      error: probe.error,
    };
  }

  const results = checks.map((check) => check.run(probe, config));
  const rawTotal = results.reduce((sum, r) => sum + r.score, 0);
  const totalScore = Math.max(0, Math.min(100, rawTotal));

  return {
    report: {
      totalScore,
      maxPossible: 100,
      confidence: getConfidence(totalScore),
      checks: results,
      config: { model: config.model, url: config.url },
      timing: {
        firstTokenMs: probe.firstTokenLatencyMs,
        totalMs: probe.totalDurationMs,
      },
    },
    error: null,
  };
}
