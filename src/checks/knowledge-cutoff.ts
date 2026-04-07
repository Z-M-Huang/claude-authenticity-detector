import type {
  AuthenticityCheck,
  ProbeResult,
  DetectorConfig,
  CheckResult,
  ScoreItem,
} from '../types.js';

interface Tier {
  points: number;
  patterns: RegExp[];
}

const tiers: Tier[] = [
  {
    points: 50,
    patterns: [
      /may 2025/i,
      /2025年5月/,
      /2025-05/,
      /may of 2025/i,
    ],
  },
  {
    points: 25,
    patterns: [
      /early 2025/i,
      /2025年初/,
      /march 2025/i,
    ],
  },
  {
    points: 10,
    patterns: [
      /january 2025/i,
      /february 2025/i,
      /2025年1月/,
      /2025年2月/,
    ],
  },
  {
    points: 0,
    patterns: [
      /april 2025/i,
      /\b20(?:2[0-4]|[01]\d)\b/,
    ],
  },
];

export const knowledgeCutoffCheck: AuthenticityCheck = {
  name: 'Knowledge Cutoff',

  run(probe: ProbeResult, _config: DetectorConfig): CheckResult {
    const maxScore = 50;
    const combined = `${probe.text} ${probe.thinkingText}`;
    const items: ScoreItem[] = [];
    let bestPoints = -1;

    for (const tier of tiers) {
      for (const pattern of tier.patterns) {
        const match = combined.match(pattern);
        if (match && tier.points > bestPoints) {
          bestPoints = tier.points;
          items.length = 0;
          items.push({
            label: `Knowledge Cutoff (${tier.points} pts)`,
            points: tier.points,
            maxPoints: maxScore,
            evidence: match[0],
          });
        }
      }
    }

    if (bestPoints < 0) {
      items.push({
        label: 'No cutoff date found',
        points: 0,
        maxPoints: maxScore,
        evidence: 'No recognized date pattern in response',
      });
    }

    const score = bestPoints > 0 ? bestPoints : 0;
    const status: CheckResult['status'] =
      score >= 40 ? 'pass' : score >= 20 ? 'warn' : 'fail';

    return { name: this.name, score, maxScore, items, status };
  },
};
