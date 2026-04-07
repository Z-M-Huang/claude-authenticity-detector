import type { AuthenticityCheck, CheckResult, ProbeResult, DetectorConfig, ScoreItem } from '../types.js';

export const usageFieldsCheck: AuthenticityCheck = {
  name: 'Usage Fields',

  run(probe: ProbeResult, _config: DetectorConfig): CheckResult {
    const items: ScoreItem[] = [];
    const snapshots = probe.usageSnapshots;
    let rawScore = 0;

    // +3: valid shape — at least one snapshot with both fields present
    const hasValidShape =
      snapshots.length > 0 &&
      'input_tokens' in snapshots[0] &&
      'output_tokens' in snapshots[0];
    if (hasValidShape) {
      items.push({ label: 'Valid usage shape', points: 3, maxPoints: 3, evidence: `${snapshots.length} snapshot(s) with expected fields` });
      rawScore += 3;
    } else {
      items.push({ label: 'Valid usage shape', points: 0, maxPoints: 3, evidence: snapshots.length === 0 ? 'No snapshots' : 'Missing fields' });
    }

    // +4: first snapshot input_tokens > 0
    if (hasValidShape && snapshots[0].input_tokens > 0) {
      items.push({ label: 'Positive input_tokens', points: 4, maxPoints: 4, evidence: `input_tokens=${snapshots[0].input_tokens}` });
      rawScore += 4;
    } else {
      items.push({ label: 'Positive input_tokens', points: 0, maxPoints: 4, evidence: hasValidShape ? `input_tokens=${snapshots[0].input_tokens}` : 'N/A' });
    }

    // +4: all snapshots output_tokens >= 0
    const allOutputNonNeg = hasValidShape && snapshots.every(s => s.output_tokens >= 0);
    if (allOutputNonNeg) {
      items.push({ label: 'Non-negative output_tokens', points: 4, maxPoints: 4, evidence: 'All snapshots have output_tokens >= 0' });
      rawScore += 4;
    } else {
      items.push({ label: 'Non-negative output_tokens', points: 0, maxPoints: 4, evidence: hasValidShape ? 'Negative output_tokens found' : 'N/A' });
    }

    // Multi-snapshot checks (require >= 2 snapshots)
    if (hasValidShape && snapshots.length >= 2) {
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];

      // +2: output_tokens monotonically non-decreasing
      let monotonic = true;
      for (let i = 1; i < snapshots.length; i++) {
        if (snapshots[i].output_tokens < snapshots[i - 1].output_tokens) {
          monotonic = false;
          break;
        }
      }
      if (monotonic) {
        items.push({ label: 'Monotonic output_tokens', points: 2, maxPoints: 2, evidence: 'output_tokens non-decreasing across snapshots' });
        rawScore += 2;
      } else {
        items.push({ label: 'Monotonic output_tokens', points: 0, maxPoints: 2, evidence: 'output_tokens decreased between snapshots' });
      }

      // +2: input_tokens consistent (same in first and last)
      if (first.input_tokens === last.input_tokens) {
        items.push({ label: 'Consistent input_tokens', points: 2, maxPoints: 2, evidence: `input_tokens=${first.input_tokens} in first and last` });
        rawScore += 2;
      } else {
        items.push({ label: 'Consistent input_tokens', points: 0, maxPoints: 2, evidence: `first=${first.input_tokens}, last=${last.input_tokens}` });
      }

      // PENALTY -4: input_tokens mismatch between first and last
      if (first.input_tokens !== last.input_tokens) {
        items.push({ label: 'Input mismatch penalty', points: -4, maxPoints: 0, evidence: `first=${first.input_tokens}, last=${last.input_tokens}` });
        rawScore -= 4;
      }

      // PENALTY -2: zero-start (first input_tokens === 0 and last > 0)
      if (first.input_tokens === 0 && last.input_tokens > 0) {
        items.push({ label: 'Zero-start penalty', points: -2, maxPoints: 0, evidence: `first input_tokens=0, last=${last.input_tokens}` });
        rawScore -= 2;
      }
    }

    const score = Math.max(0, Math.min(15, rawScore));
    const status: CheckResult['status'] = score >= 11 ? 'pass' : score >= 6 ? 'warn' : 'fail';

    return {
      name: this.name,
      score,
      maxScore: 15,
      items,
      status,
    };
  },
};
