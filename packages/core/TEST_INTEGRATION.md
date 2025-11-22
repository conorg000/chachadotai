# Integration Testing Guide

## Quick Reference

| Scenario          | Command                                                    | Cost        | When to Use          |
| ----------------- | ---------------------------------------------------------- | ----------- | -------------------- |
| **Daily Dev**     | `npm test -w @safetylayer/core`                            | FREE        | Always (default)     |
| **Test Real API** | `RUN_INTEGRATION_TESTS=true npm test -w @safetylayer/core` | ~$0.01-0.05 | Before releases only |

**Important:** Integration tests are **protected by default** - they won't run even if you have an API key, unless you explicitly set `RUN_INTEGRATION_TESTS=true`.

## Overview

The CoTMonitor has two test suites:

1. **Unit Tests** (`CoTMonitor.test.ts`) - Use mock mode, run by default, FREE
2. **Integration Tests** (`CoTMonitor.integration.test.ts`) - Use real OpenAI API, skipped by default, COSTS MONEY

## Two Testing Scenarios

### Scenario 1: Daily Development (FREE - No API Calls)

This is your default workflow. Run tests as often as you want:

```bash
# From anywhere in the repo
npm test -w @safetylayer/core

# Or from packages/core
cd packages/core
npm test
```

**Result:**

- ✅ 14 unit tests run (mock mode)
- ⏭️ 5 integration tests skipped
- 💰 **$0.00 cost**
- ⚡ Fast (~1 second)

Even if you have `OPENAI_API_KEY` in your environment or `.env` file, integration tests **will not run** unless you explicitly enable them.

### Scenario 2: Testing Real API (COSTS MONEY 💰)

Only run this when you need to verify the real OpenAI integration:

```bash
# Set the flag to enable integration tests
RUN_INTEGRATION_TESTS=true npm test -w @safetylayer/core

# Or from packages/core
cd packages/core
RUN_INTEGRATION_TESTS=true npm test
```

**Result:**

- ✅ 14 unit tests run
- ✅ 5 integration tests run (real API calls)
- 💰 **~$0.01-0.05 cost**
- 🐢 Slower (~15-30 seconds)

**Prerequisites:**

- `OPENAI_KEY` (or `OPENAI_API_KEY`) must be set (from `.env` file or environment)
- OpenAI account with available credits

### When to Use Each Scenario

**Use Scenario 1 (mock tests):**

- ✅ During active development
- ✅ Before every commit
- ✅ In your normal workflow
- ✅ Multiple times per day

**Use Scenario 2 (real API tests):**

- ⚠️ Before major releases
- ⚠️ After changing LLM prompts
- ⚠️ When debugging API issues
- ⚠️ Once per day/week (not constantly)

### What Gets Tested

Integration tests verify:

✅ **Real API connectivity** - Actual calls to OpenAI GPT-5-nano
✅ **Response parsing** - JSON parsing from real responses
✅ **Risk detection** - LLM accurately detects issues
✅ **Context handling** - userInput + finalOutput context works
✅ **Various risk levels** - Different scenarios produce appropriate scores

### Expected Output

```bash
CoTMonitor Integration Tests (Real API)
  ✓ should analyze clean CoT with real API (2500ms)
    Clean CoT Analysis: { riskScore: 0.1, labels: [], summary: '...' }

  ✓ should detect deception in CoT with real API (2800ms)
    Deceptive CoT Analysis: { riskScore: 0.75, labels: ['cot_deception'], ... }

  ✓ should detect goal drift with real API (2600ms)
  ✓ should include context in analysis (2400ms)
  ✓ should handle various risk levels (5200ms)
```

### Cost Considerations

Each integration test run makes **~5-6 API calls** to GPT-5-nano.

Estimated cost per test run: **~$0.01-0.05** (depending on token usage)

**Recommendation:** Run integration tests:

- Before major releases
- When changing LLM prompts
- When debugging API issues
- NOT in CI/CD (unless you want to pay for it)

## Manual Testing with Real API

For quick manual tests without running the full suite:

```javascript
// test-real-api.js
import { CoTMonitor } from "@safetylayer/core";

const monitor = new CoTMonitor({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-5-nano",
});

const result = await monitor.analyze({
  messageId: "test-1",
  sessionId: "manual-test",
  userInput: "Your test prompt",
  rawCoT: "<thinking>Your test reasoning</thinking>",
  finalOutput: "Your test output",
  analysis: null,
});

console.log("Result:", result.analysis);
```

Run with:

```bash
node test-real-api.js
```

## Troubleshooting

### Integration tests are skipped

**This is normal and expected!** Integration tests skip by default to protect you from charges.

If you want them to run, check both flags:

```bash
echo $RUN_INTEGRATION_TESTS  # Should be: true
echo $OPENAI_KEY             # Should be: sk-... (or OPENAI_API_KEY)
```

If integration tests are skipped and you see:

```
Tests: 14 passed, 5 skipped, 19 total
```

This means you're in **Scenario 1** (free mock tests) - this is correct! ✅

### API errors

Common issues:

- Invalid API key → Check your key is correct
- Rate limiting → Wait a few seconds and retry
- Model not found → Verify 'gpt-5-nano' is available in your account

### Timeout errors

If tests timeout (default 30s per test):

- Check your network connection
- OpenAI API might be slow
- Increase timeout in test file if needed

## Best Practices

1. **Default to Scenario 1** - Always use mock tests during development
2. **Don't commit API keys** - Use environment variables or `.env` file
3. **Run integration tests sparingly** - They cost real money on every run
4. **Explicit opt-in required** - Integration tests need `RUN_INTEGRATION_TESTS=true` flag
5. **Monitor costs** - Check OpenAI dashboard after integration test runs
6. **Protected by default** - Even with API key present, integration tests won't run accidentally

## CI/CD Integration

To add integration tests to CI (optional):

```yaml
# .github/workflows/test.yml
- name: Run unit tests
  run: npm test

- name: Run integration tests
  if: github.ref == 'refs/heads/main' # Only on main branch
  run: RUN_INTEGRATION_TESTS=true npm test
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

⚠️ **Warning:** This will make API calls on every commit to main!
