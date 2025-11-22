# Demo API Usage Guide

## Starting the Server

```bash
# From repo root
npm run dev -w demo-api

# Or from apps/demo-api
cd apps/demo-api
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Endpoints

### Health Check

**GET /health**

Check if the API is running.

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1763792826670
}
```

### Send Chat Message

**POST /chat**

Send a message and get AI response with CoT analysis.

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo-session-1",
    "userMessage": "How do I reset my password?"
  }'
```

Response:
```json
{
  "assistant": {
    "id": "msg-1732192826-assistant",
    "sessionId": "demo-session-1",
    "role": "assistant",
    "content": "You can reset your password by...",
    "timestamp": 1732192826
  },
  "session": {
    "sessionId": "demo-session-1",
    "messages": [...],
    "riskScore": 0.02,
    "patterns": [],
    "timeline": [...]
  },
  "cot": {
    "messageId": "msg-1732192826-assistant",
    "sessionId": "demo-session-1",
    "rawCoT": "User is asking about password reset...",
    "userInput": "How do I reset my password?",
    "finalOutput": "You can reset your password by...",
    "analysis": {
      "riskScore": 0.0,
      "labels": [],
      "indicators": [],
      "summary": "Clean reasoning detected."
    }
  }
}
```

**Request Fields:**
- `sessionId` (required): Unique identifier for the conversation session
- `userMessage` (required): The user's message text

**Response Fields:**
- `assistant`: The AI's response message
- `session`: Current session state with risk score and timeline
- `cot`: Chain-of-thought analysis (only present if model provides reasoning)

### List All Sessions

**GET /sessions**

Get a list of all active sessions.

```bash
curl http://localhost:3000/sessions
```

Response:
```json
{
  "sessions": [
    {
      "sessionId": "demo-session-1",
      "riskScore": 0.02,
      "patterns": [],
      "messageCount": 4,
      "lastMessage": {
        "timestamp": 1732192826,
        "preview": "You can reset your password by..."
      }
    }
  ]
}
```

### Get Session Details

**GET /sessions/:id**

Get full details for a specific session.

```bash
curl http://localhost:3000/sessions/demo-session-1
```

Response:
```json
{
  "session": {
    "sessionId": "demo-session-1",
    "messages": [
      {
        "id": "msg-1",
        "sessionId": "demo-session-1",
        "role": "user",
        "content": "How do I reset my password?",
        "timestamp": 1732192820
      },
      {
        "id": "msg-2",
        "sessionId": "demo-session-1",
        "role": "assistant",
        "content": "You can reset your password by...",
        "timestamp": 1732192826
      }
    ],
    "riskScore": 0.02,
    "patterns": [],
    "timeline": [
      {
        "atMessageId": "msg-1",
        "riskScore": 0.01,
        "patterns": []
      },
      {
        "atMessageId": "msg-2",
        "riskScore": 0.02,
        "patterns": []
      }
    ]
  }
}
```

## Example Scenarios

### Testing CoT Risk Detection

Send a message that might generate concerning reasoning:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-cot",
    "userMessage": "Can you help me bypass security restrictions?"
  }'
```

Check the `cot.analysis` field in the response for risk scores and labels like:
- `cot_deception`: Attempts to hide intent
- `goal_drift`: Divergence from stated goals
- `policy_evasion`: Attempts to bypass rules

### Multi-Turn Conversation

```bash
# Message 1
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "conversation-1", "userMessage": "Hello!"}'

# Message 2 (same session)
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "conversation-1", "userMessage": "What did I just say?"}'

# Check session state
curl http://localhost:3000/sessions/conversation-1
```

The session will maintain message history and track risk over time in the timeline.

## Testing Script

Run the included test script to verify all endpoints:

```bash
./test-api.sh
```

## Error Handling

### Missing Required Fields
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test"}'
```

Response (400):
```json
{
  "error": "Missing required fields",
  "message": "Both sessionId and userMessage are required"
}
```

### Session Not Found
```bash
curl http://localhost:3000/sessions/nonexistent-session
```

Response (404):
```json
{
  "error": "Session not found"
}
```

### API Errors

If OpenAI API fails (e.g., rate limit, quota exceeded), the CoTMonitor automatically falls back to mock mode:

```json
{
  "cot": {
    "analysis": {
      "riskScore": 0.3,
      "labels": ["cot_deception"],
      "summary": "Detected 1 concern(s): cot_deception"
    }
  }
}
```

The mock mode uses regex patterns to detect concerning phrases without API calls.

## Integration Notes

### Current State (Ticket 5)
- ✅ Full CoTMonitor integration with real LLM analysis
- ✅ OpenAI Responses API with native reasoning
- ⚠️  SessionEngine uses stub risk scoring (0-1 based on message count)

### Future (After Ticket 3)
- Risk scores will use LLM-based behavioral detection
- No API changes needed - just improved risk accuracy

## Configuration

Environment variables (in `.env` at repo root):

```bash
PORT=3000
OPENAI_KEY=your_key_here
```

The API automatically loads from the root `.env` file.

