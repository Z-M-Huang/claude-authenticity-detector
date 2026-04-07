import chalk from 'chalk';
import type { DetectorReport, DetectorConfig, CheckResult } from './types.js';

export function maskApiKey(key: string): string {
  if (key.length < 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function statusColor(status: 'pass' | 'warn' | 'fail'): typeof chalk.green {
  if (status === 'pass') return chalk.green;
  if (status === 'warn') return chalk.yellow;
  return chalk.red;
}

function confidenceColor(confidence: string): typeof chalk.green {
  if (confidence === 'HIGH') return chalk.green;
  if (confidence === 'MEDIUM') return chalk.yellow;
  return chalk.red;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

const BOX_WIDTH = 62;

function boxLine(content: string): string {
  const bare = stripAnsi(content);
  const pad = BOX_WIDTH - 2 - bare.length; // 2 for ║ on each side
  const right = pad > 0 ? ' '.repeat(pad) : '';
  return `║${content}${right}║`;
}

function formatCheckSection(check: CheckResult): string {
  const colorFn = statusColor(check.status);
  const statusLabel = colorFn(check.status.toUpperCase());
  const scorePart = `${check.score} / ${check.maxScore}`;

  const headerLabel = `── ${check.name} `;
  const headerRight = ` ${scorePart}  ${statusLabel} ──`;
  const bareRight = ` ${scorePart}  ${check.status.toUpperCase()} ──`;
  const dashCount = BOX_WIDTH - headerLabel.length - bareRight.length;
  const dashes = dashCount > 0 ? '─'.repeat(dashCount) : '';
  const header = `${headerLabel}${dashes}${headerRight}`;

  const lines: string[] = [header];

  for (const item of check.items) {
    const indicator = item.points > 0 ? chalk.green('✓') : chalk.red('✗');
    const pointsStr = item.points >= 0 ? `+${item.points}` : `${item.points}`;
    lines.push(`  ${indicator} ${pointsStr}  ${item.label}`);
    if (item.evidence) {
      lines.push(`         Evidence: ${item.evidence}`);
    }
  }

  return lines.join('\n');
}

export function formatReport(report: DetectorReport, config: DetectorConfig): string {
  const lines: string[] = [];

  // Top border
  lines.push(`╔${'═'.repeat(BOX_WIDTH - 2)}╗`);

  // Header
  lines.push(boxLine('  Claude Authenticity Detector — Report'));
  lines.push(boxLine(`  Model: ${report.config.model}  URL: ${report.config.url}`));
  const timeStr = `  Time: ${(report.timing.totalMs / 1000).toFixed(1)}s (first token: ${(report.timing.firstTokenMs / 1000).toFixed(1)}s)`;
  lines.push(boxLine(timeStr));

  // Separator
  lines.push(`╠${'═'.repeat(BOX_WIDTH - 2)}╣`);

  // Checks
  for (const check of report.checks) {
    lines.push(formatCheckSection(check));
  }

  // Footer separator
  lines.push(`╠${'═'.repeat(BOX_WIDTH - 2)}╣`);

  // Total line
  const confColorFn = confidenceColor(report.confidence);
  const totalContent = `  TOTAL: ${report.totalScore} / ${report.maxPossible}    Confidence: ${confColorFn(report.confidence)}`;
  lines.push(boxLine(totalContent));

  // Bottom border
  lines.push(`╚${'═'.repeat(BOX_WIDTH - 2)}╝`);

  return lines.join('\n');
}

export function formatError(error: string): string {
  return chalk.red(`Error: ${error}`);
}
