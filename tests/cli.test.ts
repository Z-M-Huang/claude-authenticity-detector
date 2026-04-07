import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock modules before imports
vi.mock('../src/runner.js', () => ({
  runDetection: vi.fn(),
}));
vi.mock('../src/output.js', () => ({
  formatReport: vi.fn().mockReturnValue('mock-report'),
  formatError: vi
    .fn()
    .mockImplementation((msg: string) => `Error: ${msg}`),
  maskApiKey: vi
    .fn()
    .mockImplementation((key: string) =>
      key.length >= 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****',
    ),
}));

import { runDetection } from '../src/runner.js';
import { formatReport, formatError, maskApiKey } from '../src/output.js';
import type { DetectorReport } from '../src/types.js';

const mockRunDetection = vi.mocked(runDetection);
const mockFormatReport = vi.mocked(formatReport);
const mockFormatError = vi.mocked(formatError);
const mockMaskApiKey = vi.mocked(maskApiKey);

// Test-only placeholder keys (not real credentials)
const TEST_KEY = 'test-placeholder-key-for-unit-tests';
const TEST_KEY_FROM_ENV = 'env-placeholder-key-for-tests';
const TEST_KEY_FROM_FLAG = 'flag-placeholder-key-for-test';

let savedApiKey: string | undefined;

function makeReport(overrides?: Partial<DetectorReport>): DetectorReport {
  return {
    totalScore: 85,
    maxPossible: 100,
    confidence: 'HIGH',
    checks: [],
    config: { model: 'claude-opus-4-6', url: 'https://api.example.com' },
    timing: { firstTokenMs: 200, totalMs: 3000 },
    ...overrides,
  };
}

function argv(...args: string[]): string[] {
  return ['node', 'cli', ...args];
}

beforeEach(() => {
  savedApiKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  process.exitCode = undefined;
  mockRunDetection.mockReset();
  mockFormatReport.mockReturnValue('mock-report');
  mockFormatError.mockImplementation((msg: string) => `Error: ${msg}`);
  mockMaskApiKey.mockImplementation((key: string) =>
    key.length >= 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****',
  );
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  if (savedApiKey !== undefined) {
    process.env.ANTHROPIC_API_KEY = savedApiKey;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }
  vi.restoreAllMocks();
});

describe('cli', () => {
  async function loadMain() {
    const mod = await import('../src/cli.js');
    return mod.main;
  }

  it('missing --url exits with code 2', async () => {
    const main = await loadMain();
    await main(argv('--model', 'x', '--api-key', 'k'));
    expect(process.exitCode).toBe(2);
    expect(console.error).toHaveBeenCalled();
  });

  it('missing --model exits with code 2', async () => {
    const main = await loadMain();
    await main(argv('--url', 'http://example.com', '--api-key', 'k'));
    expect(process.exitCode).toBe(2);
    expect(console.error).toHaveBeenCalled();
  });

  it('missing API key (no flag, no env) exits with code 2', async () => {
    const main = await loadMain();
    await main(
      argv('--url', 'http://example.com', '--model', 'claude-opus-4-6'),
    );
    expect(process.exitCode).toBe(2);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Missing API key'),
    );
  });

  it('API key from env var is used when --api-key not provided', async () => {
    process.env.ANTHROPIC_API_KEY = TEST_KEY_FROM_ENV;
    mockRunDetection.mockResolvedValue({
      report: makeReport(),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv('--url', 'http://example.com', '--model', 'claude-opus-4-6'),
    );

    expect(mockRunDetection).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: TEST_KEY_FROM_ENV }),
    );
  });

  it('--api-key flag takes precedence over env var', async () => {
    process.env.ANTHROPIC_API_KEY = TEST_KEY_FROM_ENV;
    mockRunDetection.mockResolvedValue({
      report: makeReport(),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY_FROM_FLAG,
      ),
    );

    expect(mockRunDetection).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: TEST_KEY_FROM_FLAG }),
    );
  });

  it('HIGH confidence exits with code 0', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport({ confidence: 'HIGH' }),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(process.exitCode).toBe(0);
    expect(console.log).toHaveBeenCalledWith('mock-report');
  });

  it('MEDIUM confidence exits with code 0', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport({ confidence: 'MEDIUM', totalScore: 65 }),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(process.exitCode).toBe(0);
  });

  it('LOW confidence exits with code 1', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport({ confidence: 'LOW', totalScore: 40 }),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(process.exitCode).toBe(1);
  });

  it('VERY_LOW confidence exits with code 1', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport({ confidence: 'VERY_LOW', totalScore: 10 }),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(process.exitCode).toBe(1);
  });

  it('probe error returns exit code 2', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport({ checks: [], totalScore: 0, confidence: 'VERY_LOW' }),
      error: 'API error 401: Unauthorized',
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(process.exitCode).toBe(2);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('API error 401: Unauthorized'),
    );
  });

  it('unexpected exception exits with code 2', async () => {
    mockRunDetection.mockRejectedValue(new Error('Network failure'));

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(process.exitCode).toBe(2);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Network failure'),
    );
  });

  it('API key is masked in report output', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport(),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(mockMaskApiKey).toHaveBeenCalledWith(TEST_KEY);
    // formatReport should receive the masked key, not the raw one
    expect(mockFormatReport).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        apiKey: `${TEST_KEY.slice(0, 4)}...${TEST_KEY.slice(-4)}`,
      }),
    );
  });

  it('--timeout converts seconds to milliseconds in config', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport(),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
        '--timeout',
        '60',
      ),
    );

    expect(mockRunDetection).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 60000 }),
    );
  });

  it('default timeout is 120 seconds (120000 ms)', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport(),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(mockRunDetection).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 120000 }),
    );
  });

  it('--verbose flag sets verbose to true in config', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport(),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
        '--verbose',
      ),
    );

    expect(mockRunDetection).toHaveBeenCalledWith(
      expect.objectContaining({ verbose: true }),
    );
  });

  it('verbose defaults to false', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport(),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'http://example.com',
        '--model',
        'claude-opus-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(mockRunDetection).toHaveBeenCalledWith(
      expect.objectContaining({ verbose: false }),
    );
  });

  it('config contains correct url and model', async () => {
    mockRunDetection.mockResolvedValue({
      report: makeReport(),
      error: null,
    });

    const main = await loadMain();
    await main(
      argv(
        '--url',
        'https://my-proxy.example.com',
        '--model',
        'claude-sonnet-4-6',
        '--api-key',
        TEST_KEY,
      ),
    );

    expect(mockRunDetection).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://my-proxy.example.com',
        model: 'claude-sonnet-4-6',
      }),
    );
  });
});
