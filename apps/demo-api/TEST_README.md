# Demo API Tests

## Running Tests

```bash
# From repo root
npm test -w demo-api

# From apps/demo-api
npm test
```

## Test Suites

### 1. OpenAI Helper Tests (`src/utils/__tests__/openai.test.ts`)

Tests the `<answer>` tag extraction logic:

- ✅ Extracts content from `<answer>` tags
- ✅ Treats everything outside `<answer>` tags as CoT reasoning
- ✅ Handles responses without `<answer>` tags (treats entire response as CoT)
- ✅ Handles multi-line content in `<answer>` tags
- ✅ Handles empty reasoning before `<answer>` tags
- ✅ Handles reasoning both before and after `<answer>` tags

**Note:** These are unit tests that test the regex extraction logic directly, not the full OpenAI integration (to avoid API costs).

### 2. API Endpoint Tests (`src/__tests__/api.test.ts`)

Tests all API endpoints with mocked OpenAI responses:

**GET /health**
- ✅ Returns ok status

**POST /chat**
- ✅ Processes chat messages successfully
- ✅ Returns 400 if sessionId is missing
- ✅ Returns 400 if userMessage is missing  
- ✅ Handles responses without reasoning (null CoT)

**GET /sessions**
- ✅ Returns list of sessions
- ✅ Includes session metadata (messageCount, riskScore, lastMessage)

**GET /sessions/:id**
- ✅ Returns session details with messages and timeline
- ✅ Returns 404 for non-existent sessions

## Test Coverage

All core functionality is covered:
- Request validation
- OpenAI integration (mocked)
- SessionEngine integration
- CoTMonitor integration
- Error handling

## Notes

- Tests use mocked OpenAI responses to avoid API costs
- SessionEngine uses in-memory storage (resets between test runs)
- CoTMonitor uses mock mode in tests
- All tests are independent and can run in parallel

