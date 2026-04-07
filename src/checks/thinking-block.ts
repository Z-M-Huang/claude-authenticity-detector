import type { AuthenticityCheck, CheckResult, ProbeResult, DetectorConfig, ScoreItem } from '../types.js';

export const thinkingBlockCheck: AuthenticityCheck = {
  name: 'Thinking Block',

  run(probe: ProbeResult, _config: DetectorConfig): CheckResult {
    const maxScore = 15;
    const items: ScoreItem[] = [];
    let rawScore = 0;

    // +4 for having a thinking block
    const thinkingBlockPoints = probe.hasThinkingBlock ? 4 : 0;
    rawScore += thinkingBlockPoints;
    items.push({
      label: 'Thinking block present',
      points: thinkingBlockPoints,
      maxPoints: 4,
      evidence: probe.hasThinkingBlock
        ? 'Response includes a thinking block'
        : 'No thinking block found in response',
    });

    // +5 for having thinking deltas
    const thinkingDeltaPoints = probe.hasThinkingDeltas ? 5 : 0;
    rawScore += thinkingDeltaPoints;
    items.push({
      label: 'Thinking deltas streamed',
      points: thinkingDeltaPoints,
      maxPoints: 5,
      evidence: probe.hasThinkingDeltas
        ? 'Thinking content streamed via deltas'
        : 'No thinking deltas observed',
    });

    // +4 for having both text block and text deltas
    const textPoints = probe.hasTextBlock && probe.hasTextDeltas ? 4 : 0;
    rawScore += textPoints;
    items.push({
      label: 'Text block with deltas',
      points: textPoints,
      maxPoints: 4,
      evidence:
        probe.hasTextBlock && probe.hasTextDeltas
          ? 'Text block present with streamed deltas'
          : `Text block: ${probe.hasTextBlock}, text deltas: ${probe.hasTextDeltas}`,
    });

    // +2 for valid (non-empty) signature deltas
    const signaturePoints = probe.hasSignatureDeltas && !probe.emptySignatureDeltas ? 2 : 0;
    rawScore += signaturePoints;
    items.push({
      label: 'Signature deltas present',
      points: signaturePoints,
      maxPoints: 2,
      evidence: probe.hasSignatureDeltas && !probe.emptySignatureDeltas
        ? 'Non-empty signature deltas detected (cryptographic authenticity signal)'
        : probe.hasSignatureDeltas
          ? 'Signature deltas were empty (possible proxy stripping)'
          : 'No signature deltas observed',
    });

    // -4 for empty signature deltas
    const signaturePenalty = probe.emptySignatureDeltas ? -4 : 0;
    rawScore += signaturePenalty;
    items.push({
      label: 'Empty signature deltas penalty',
      points: signaturePenalty,
      maxPoints: 0,
      evidence: probe.emptySignatureDeltas
        ? 'Signature deltas were empty (possible proxy stripping)'
        : 'No empty signature deltas detected',
    });

    const score = Math.max(0, Math.min(maxScore, rawScore));
    const status: CheckResult['status'] =
      score >= 11 ? 'pass' : score >= 6 ? 'warn' : 'fail';

    return { name: this.name, score, maxScore, items, status };
  },
};
