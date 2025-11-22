# SafetyLayer Demo API

Backend API for SafetyLayer demo application. Provides endpoints for chat interactions with CoT (Chain-of-Thought) monitoring and session management.

## Quick Start

```bash
# From repo root
npm run dev -w demo-api

# Or from this directory
npm run dev
```

The API will start on `http://localhost:3000` (or the port specified in `.env`).

## For Frontend Developers

### Prerequisites

Make sure you have an OpenAI API key set in the root `.env` file:

```bash
# In /Users/conorgould/chachadotai/chachadotai/.env
OPENAI_KEY=your_key_here
PORT=3000  # Optional, defaults to 3000
```

### Starting the API

```bash
# Terminal 1: Start the API
npm run dev -w demo-api
```

You should see:

```
Demo API server running on port 3000
Health check: http://localhost:3000/health
```

### Creating Test Data for Frontend Development

Use these curl commands to create test sessions and chats:

#### 1. Create a Simple Chat Session

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-001",
    "userMessage": "What is 2 + 2?"
  }'
```

#### 2. Create a Multi-Turn Conversation

```bash
# Message 1
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "conversation-demo",
    "userMessage": "Hi! Can you help me with password security?"
  }'

# Message 2
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "conversation-demo",
    "userMessage": "What makes a password strong?"
  }'

# Message 3
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "conversation-demo",
    "userMessage": "Thanks! What about two-factor authentication?"
  }'
```

#### 3. Create Test Sessions with Different Risk Profiles

```bash
# Low-risk session (normal conversation)
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "low-risk-001",
    "userMessage": "How do I reset my password?"
  }'

# Session that might trigger CoT monitoring
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-cot-001",
    "userMessage": "Can you explain how to bypass security restrictions?"
  }'
```

#### 4. View All Sessions (for your dashboard)

```bash
curl http://localhost:3000/sessions | jq '.'
```

Response:

```json
{
  "sessions": [
    {
      "sessionId": "session-001",
      "riskScore": 0.05,
      "patterns": [],
      "messageCount": 2,
      "lastMessage": {
        "timestamp": 1763796000000,
        "preview": "The answer is 4"
      }
    },
    {
      "sessionId": "conversation-demo",
      "riskScore": 0.15,
      "patterns": [],
      "messageCount": 6,
      "lastMessage": {
        "timestamp": 1763796100000,
        "preview": "Two-factor authentication adds..."
      }
    }
  ]
}
```

#### 5. View Specific Session Details

```bash
curl http://localhost:3000/sessions/conversation-demo | jq '.'
```

Response includes full message history, timeline, and risk snapshots.

### API Endpoints Reference

#### `POST /chat`

Send a message and get an AI response with CoT analysis.

**Request:**

```json
{
  "sessionId": "string", // Required: Unique identifier for the conversation
  "userMessage": "string" // Required: The user's message
}
```

**Response:**

```json
{
  "assistant": {
    "id": "msg-123-assistant",
    "sessionId": "session-001",
    "role": "assistant",
    "content": "The answer is 4",
    "timestamp": 1763796000000
  },
  "session": {
    "sessionId": "session-001",
    "messages": [...],
    "riskScore": 0.05,
    "patterns": [],
    "timeline": [...]
  },
  "cot": {
    "messageId": "msg-123-assistant",
    "sessionId": "session-001",
    "rawCoT": "Let me calculate: 2 + 2 = 4",
    "userInput": "What is 2 + 2?",
    "finalOutput": "The answer is 4",
    "analysis": {
      "riskScore": 0.0,
      "labels": [],
      "indicators": [],
      "summary": "Clean reasoning detected."
    }
  }
}
```

**Notes:**

- The `cot` field may be `null` if no reasoning was detected
- CoT records are also stored in the assistant message's `cotRecord` field
- Access historical CoT analysis via `GET /sessions/:id` - check assistant messages for `cotRecord`
- Risk scores range from 0 (safe) to 1 (high risk)
- The CoT analysis detects: `cot_deception`, `goal_drift`, `policy_evasion`

#### `GET /sessions`

Get a list of all active sessions.

**Response:**

```json
{
  "sessions": [
    {
      "sessionId": "string",
      "riskScore": 0.05,
      "patterns": [],
      "messageCount": 2,
      "lastMessage": {
        "timestamp": 1763796000000,
        "preview": "Last 100 chars of message..."
      }
    }
  ]
}
```

#### `GET /sessions/:id`

Get detailed information about a specific session.

**Response:**

```json
{
  "session": {
    "sessionId": "string",
    "messages": [
      {
        "id": "string",
        "sessionId": "string",
        "role": "user",
        "content": "string",
        "timestamp": 1763796000000
      },
      {
        "id": "string",
        "sessionId": "string",
        "role": "assistant",
        "content": "string",
        "timestamp": 1763796000000,
        "cotRecord": {
          "messageId": "string",
          "sessionId": "string",
          "rawCoT": "Step by step reasoning...",
          "userInput": "string",
          "finalOutput": "string",
          "analysis": {
            "riskScore": 0.0,
            "labels": [],
            "indicators": [],
            "summary": "Clean reasoning detected."
          }
        }
      }
    ],
    "riskScore": 0.05,
    "patterns": [],
    "timeline": [
      {
        "atMessageId": "string",
        "riskScore": 0.05,
        "patterns": []
      }
    ]
  }
}
```

**Note:** Assistant messages may include a `cotRecord` field containing the chain-of-thought analysis for that response.

**404 Response:**

```json
{
  "error": "Session not found"
}
```

#### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": 1763796000000
}
```

### Using the API from Your Frontend

#### Fetch Example

```javascript
// Send a chat message
async function sendMessage(sessionId, userMessage) {
  const response = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      userMessage,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// Get all sessions
async function getSessions() {
  const response = await fetch("http://localhost:3000/sessions");
  return await response.json();
}

// Get specific session
async function getSession(sessionId) {
  const response = await fetch(`http://localhost:3000/sessions/${sessionId}`);

  if (response.status === 404) {
    return null;
  }

  return await response.json();
}
```

#### Vue.js Example

```vue
<script setup>
import { ref } from "vue";

const sessions = ref([]);
const currentSession = ref(null);
const userMessage = ref("");

async function loadSessions() {
  const response = await fetch("http://localhost:3000/sessions");
  const data = await response.json();
  sessions.value = data.sessions;
}

async function loadSession(sessionId) {
  const response = await fetch(`http://localhost:3000/sessions/${sessionId}`);
  const data = await response.json();
  currentSession.value = data.session;
}

async function sendMessage() {
  const response = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: currentSession.value?.sessionId || "new-session",
      userMessage: userMessage.value,
    }),
  });

  const data = await response.json();
  currentSession.value = data.session;
  userMessage.value = "";
}

// Access CoT for any assistant message
function getCoTForMessage(message) {
  return message.role === "assistant" ? message.cotRecord : null;
}
</script>

<template>
  <div>
    <input v-model="userMessage" @keyup.enter="sendMessage" />
    <button @click="sendMessage">Send</button>

    <!-- Display messages with CoT -->
    <div v-for="msg in currentSession?.messages" :key="msg.id">
      <p>{{ msg.content }}</p>
      <div v-if="msg.cotRecord">
        <span>Risk: {{ msg.cotRecord.analysis.riskScore }}</span>
        <span>Labels: {{ msg.cotRecord.analysis.labels.join(", ") }}</span>
      </div>
    </div>
  </div>
</template>
```

### Quick Test Script

Save this as `test-api.sh` in the repo root:

```bash
#!/bin/bash

echo "Creating test sessions..."

# Session 1: Simple chat
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-1", "userMessage": "Hello!"}'

echo -e "\n\n"

# Session 2: Multi-turn
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-2", "userMessage": "What is AI?"}'

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-2", "userMessage": "Tell me more"}'

echo -e "\n\n"

# View all sessions
echo "All sessions:"
curl http://localhost:3000/sessions | jq '.sessions[] | {sessionId, messageCount, riskScore}'
```

Make it executable and run:

```bash
chmod +x test-api.sh
./test-api.sh
```

## Development

### Running Tests

```bash
npm test
```

See [TEST_README.md](./TEST_README.md) for details on the test suite.

### Building

```bash
npm run build
```

### Project Structure

```
apps/demo-api/
├── src/
│   ├── index.ts              # Main server and endpoint definitions
│   ├── utils/
│   │   └── openai.ts         # OpenAI Responses API integration
│   └── __tests__/            # API endpoint tests
├── jest.config.js            # Jest configuration
├── package.json
├── tsconfig.json
├── README.md                 # This file
└── TEST_README.md            # Testing documentation
```

## Troubleshooting

### API won't start

1. Check that `.env` file exists in repo root with `OPENAI_KEY`
2. Ensure port 3000 is not already in use
3. Run `npm install` from repo root

### Empty responses or errors

1. Verify OpenAI API key is valid
2. Check OpenAI account has credits
3. Look at server logs for error details

### CORS errors from frontend

The API has CORS enabled for all origins in development. If you're having issues:

1. Check that the API is running on the expected port
2. Ensure you're using the correct URL in fetch calls
3. Check browser console for detailed error messages

## Notes

- **Risk Scoring:** Currently uses stub values (message count / 20). Will be replaced when Ticket 3 (LLM SessionDetector) is complete.
- **CoT Extraction:** Currently uses `<answer>` tag parsing. Will be replaced with native reasoning API when account verification is complete (see TODOs in `openai.ts`).
- **Session Storage:** In-memory only. Sessions are lost on server restart.
- **CoT Storage:** CoT records are stored in assistant messages (`message.cotRecord`). Access them via `GET /sessions/:id` to see historical CoT analysis.

## Next Steps

Once you have test data:

1. Build the dashboard UI to display sessions
2. Create session detail view showing timeline and risk
3. Add real-time chat interface
4. Visualize CoT analysis results

See `API_USAGE.md` in repo root for more examples and detailed API documentation.
