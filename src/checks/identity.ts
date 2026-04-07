import type {
  AuthenticityCheck,
  ProbeResult,
  DetectorConfig,
  CheckResult,
  ScoreItem,
} from '../types.js';

const competitorPattern = /\b(GPT|DeepSeek|GLM|Gemini|Llama|Mistral|Qwen)\b/i;

const negationPattern =
  /\b(?:not|unlike|different from|distinct from|rather than)\b\s+(?:\w+\s+){0,3}/i;

function hasCompetitorWithoutNegation(text: string): RegExpMatchArray | null {
  const match = text.match(competitorPattern);
  if (!match) return null;

  // Check if the match is preceded by a negation context
  const beforeMatch = text.slice(0, match.index);
  // Look at the tail of the preceding text for negation phrases
  const trailingContext = beforeMatch.slice(-40);
  if (negationPattern.test(trailingContext)) {
    // This occurrence is negated — check if there are more occurrences
    const remaining = text.slice(match.index! + match[0].length);
    return hasCompetitorWithoutNegation(remaining);
  }

  return match;
}

const identityPattern = /claude|anthropic|我是claude/i;

const datePattern = /\b20\d{2}\b/;

export const identityCheck: AuthenticityCheck = {
  name: 'Identity',

  run(probe: ProbeResult, _config: DetectorConfig): CheckResult {
    const maxScore = 0;
    const items: ScoreItem[] = [];
    const text = probe.text;
    let total = 0;

    // 1. Model mismatch: declaredModel exists but doesn't include 'claude'
    if (
      probe.declaredModel &&
      !probe.declaredModel.toLowerCase().includes('claude')
    ) {
      const penalty = -10;
      total += penalty;
      items.push({
        label: 'Model mismatch',
        points: penalty,
        maxPoints: 0,
        evidence: `declaredModel="${probe.declaredModel}" does not contain "claude"`,
      });
    }

    // 2. Competitor self-ID (excluding negation context)
    const competitorMatch = hasCompetitorWithoutNegation(text);
    if (competitorMatch) {
      const penalty = -25;
      total += penalty;
      items.push({
        label: 'Competitor self-identification',
        points: penalty,
        maxPoints: 0,
        evidence: `Found "${competitorMatch[0]}" without negation context`,
      });
    }

    // 3. Missing identity: text doesn't mention Claude or Anthropic
    if (!identityPattern.test(text)) {
      const penalty = -8;
      total += penalty;
      items.push({
        label: 'Missing Claude/Anthropic identity',
        points: penalty,
        maxPoints: 0,
        evidence: 'No mention of Claude or Anthropic',
      });
    }

    // 4. Missing cutoff: no date-like pattern
    if (!datePattern.test(text)) {
      const penalty = -8;
      total += penalty;
      items.push({
        label: 'Missing knowledge cutoff date',
        points: penalty,
        maxPoints: 0,
        evidence: 'No year pattern (e.g. 2024, 2025) found',
      });
    }

    const score = total;
    const status: CheckResult['status'] =
      score === 0 ? 'pass' : score >= -10 ? 'warn' : 'fail';

    return { name: this.name, score, maxScore, items, status };
  },
};
