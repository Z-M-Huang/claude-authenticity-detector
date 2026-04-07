# @zh-npm/claude-authenticity-detector

Verify whether an API endpoint is serving a genuine Anthropic Claude model by probing its streaming behavior, thinking capabilities, and identity signals.

## Installation

```bash
npm install -g @zh-npm/claude-authenticity-detector
```

## CLI Usage

```bash
claude-authenticity-detector --url https://api.anthropic.com --api-key sk-ant-...
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--url` | `https://api.anthropic.com` | Base URL of the API endpoint |
| `--api-key` | `$ANTHROPIC_API_KEY` | Anthropic API key (falls back to env var) |
| `--model` | `claude-opus-4-6` | Model identifier to probe |
| `--timeout` | `120000` | Request timeout in milliseconds |
| `--verbose` | `false` | Print detailed probe events |

## Scoring

The detector runs 5 checks, producing a score from 0 to 100:

| Check | Points | What it measures |
|-------|--------|------------------|
| Knowledge Cutoff | 0 -- 50 | Whether the model's stated knowledge cutoff matches known Claude dates |
| SSE Shape | 0 -- 20 | Whether the streaming event sequence matches Anthropic's SSE protocol |
| Thinking Block | 0 -- 15 | Presence and structure of extended-thinking content blocks |
| Usage Fields | 0 -- 15 | Correct input/output token usage reporting across stream events |
| Identity Penalties | -25 -- 0 | Deductions for identity inconsistencies (wrong model name, non-Claude claims) |

### Confidence Levels

| Level | Score Range |
|-------|-------------|
| `HIGH` | >= 80 |
| `MEDIUM` | 60 -- 79 |
| `LOW` | 35 -- 59 |
| `VERY_LOW` | < 35 |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | HIGH or MEDIUM confidence |
| `1` | LOW or VERY_LOW confidence |
| `2` | Error (network failure, invalid key, timeout, etc.) |

## Programmatic Usage

```typescript
import { runDetection } from '@zh-npm/claude-authenticity-detector';

const { report, error } = await runDetection({
  url: 'https://api.anthropic.com',
  apiKey: 'your-api-key',
  model: 'claude-opus-4-6',
  timeout: 120000,
  verbose: false,
});

console.log(report.totalScore, report.confidence);
```

## License

Apache-2.0
