import { Command, CommanderError } from 'commander';
import { runDetection } from './runner.js';
import { formatReport, formatError, maskApiKey } from './output.js';
import type { DetectorConfig } from './types.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('claude-authenticity-detector')
    .description(
      'Validate whether an API relay/proxy is serving authentic Claude models',
    )
    .version('0.1.0')
    .requiredOption('--url <url>', 'API base URL')
    .option(
      '--api-key <key>',
      'API key (or set ANTHROPIC_API_KEY env var)',
    )
    .requiredOption('--model <model>', 'Model identifier to test')
    .option('--timeout <seconds>', 'Request timeout in seconds', '120')
    .option('--verbose', 'Show detailed event log', false)
    .exitOverride();

  return program;
}

export async function main(argv?: string[]): Promise<void> {
  const program = createProgram();

  try {
    program.parse(argv ?? process.argv);
  } catch (err) {
    if (err instanceof CommanderError) {
      // help/version exit with code 0 -- let output through, don't treat as error
      if (err.exitCode === 0) {
        process.exitCode = 0;
        return;
      }
      console.error(formatError(err.message));
      process.exitCode = 2;
      return;
    }
    throw err;
  }

  const opts = program.opts();

  // Resolve API key: flag takes precedence over env var
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      formatError(
        'Missing API key. Provide --api-key or set ANTHROPIC_API_KEY.',
      ),
    );
    process.exitCode = 2;
    return;
  }

  const timeoutSec = parseInt(opts.timeout, 10);
  if (isNaN(timeoutSec) || timeoutSec <= 0) {
    console.error(formatError('--timeout must be a positive integer'));
    process.exitCode = 2;
    return;
  }

  const config: DetectorConfig = {
    url: opts.url,
    apiKey,
    model: opts.model,
    timeout: timeoutSec * 1000,
    verbose: opts.verbose ?? false,
  };

  try {
    const { report, error } = await runDetection(config);

    if (error) {
      console.error(formatError(error));
      process.exitCode = 2;
      return;
    }

    // Print report (mask API key in config for display)
    const maskedConfig = { ...config, apiKey: maskApiKey(config.apiKey) };
    console.log(formatReport(report, maskedConfig));

    // Exit code based on confidence
    if (report.confidence === 'HIGH' || report.confidence === 'MEDIUM') {
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(
      formatError(err instanceof Error ? err.message : String(err)),
    );
    process.exitCode = 2;
  }
}

import { realpathSync } from 'fs';
import { fileURLToPath } from 'url';

const self = fileURLToPath(import.meta.url);
const invoked = (() => { try { return realpathSync(process.argv[1]); } catch { return ''; } })();
if (invoked === self) main();
