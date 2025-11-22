# SafetyLayer Dashboard

Vue 3 + Vite dashboard for monitoring SafetyLayer sessions in real-time.

## Features

- **Sessions List**: View all active sessions with live polling (every 3 seconds)
- **Risk Scoring**: Color-coded risk badges (low/medium/high)
- **Pattern Detection**: Display detected behavioral patterns
- **Session Detail**: Detailed view with message history and risk timeline chart
- **CoT Analysis**: Click assistant messages to view Chain-of-Thought analysis
- **Real-time Updates**: Auto-refreshing data without manual reload

## Prerequisites

- Node.js 18+
- Running demo API (Ticket 5) on `http://localhost:3000`

## Installation

```bash
# From repo root
npm install

# Or from this directory
npm install
```

## Configuration

Create a `.env` file (optional):

```bash
VITE_API_URL=http://localhost:3000
```

If not set, defaults to `http://localhost:3000`.

## Development

```bash
# From repo root
npm run dev -w dashboard

# Or from this directory
npm run dev
```

Dashboard will be available at `http://localhost:5173`

## Build

```bash
# From repo root
npm run build -w dashboard

# Or from this directory
npm run build
```

## Usage

### 1. Start the Demo API

First, make sure the demo API (Ticket 5) is running:

```bash
npm run dev -w demo-api
```

### 2. Start the Dashboard

```bash
npm run dev -w dashboard
```

### 3. View Sessions

- Open `http://localhost:5173` in your browser
- Sessions will auto-refresh every 3 seconds
- Click any session row to view details

### 4. View Session Details

- Click "View" button or click on a session row
- See conversation history, risk timeline chart, and detected patterns
- Click "View CoT Analysis" on assistant messages to see chain-of-thought analysis

## Architecture

### Components

- **SessionsList.vue**: Main sessions list with polling
  - Polls `GET /sessions` every 3 seconds
  - Displays sessionId, risk score, patterns, message count, last activity
  - Click to navigate to session detail

- **SessionDetail.vue**: Session detail view
  - Polls `GET /sessions/:id` every 5 seconds
  - Displays risk timeline chart (Chart.js)
  - Shows full conversation history
  - CoT analysis modal for assistant messages

### Routes

- `/`: Sessions list (SessionsList.vue)
- `/sessions/:id`: Session detail (SessionDetail.vue)

### API Integration

Uses `axios` to communicate with demo API:

- `GET /sessions`: Fetch all sessions
- `GET /sessions/:id`: Fetch specific session with messages and timeline

### Styling

- Clean, professional UI with gradient header
- Color-coded risk indicators:
  - **Green (low)**: Risk score < 0.4
  - **Orange (medium)**: Risk score 0.4 - 0.69
  - **Red (high)**: Risk score ≥ 0.7
- Responsive design
- Smooth animations and transitions

## Tech Stack

- **Vue 3**: Frontend framework (Composition API with `<script setup>`)
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Vue Router**: Client-side routing
- **Chart.js + vue-chartjs**: Risk timeline visualization
- **Axios**: HTTP client for API calls

## Integration with Demo API

The dashboard expects the demo API to provide:

### `GET /sessions` Response

```json
{
  "sessions": [
    {
      "sessionId": "user-123",
      "riskScore": 0.45,
      "patterns": ["gradual_escalation"],
      "messageCount": 8,
      "lastMessageTimestamp": 1703000000000
    }
  ]
}
```

### `GET /sessions/:id` Response

```json
{
  "sessionId": "user-123",
  "riskScore": 0.45,
  "patterns": ["gradual_escalation"],
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Hello",
      "timestamp": 1703000000000
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "Hi there!",
      "timestamp": 1703000001000,
      "cotAnalysis": {
        "riskScore": 0.1,
        "labels": [],
        "summary": "Clean response",
        "rawCoT": "<thinking>Safe greeting</thinking>"
      }
    }
  ],
  "riskTimeline": [
    {
      "timestamp": 1703000000000,
      "riskScore": 0.05
    },
    {
      "timestamp": 1703000001000,
      "riskScore": 0.1
    }
  ]
}
```

## Development Notes

- All components use TypeScript for type safety
- Polling automatically starts on mount and stops on unmount
- Error handling with user-friendly messages and retry buttons
- Live indicator shows connection status
- Chart automatically updates when timeline data changes

## Testing

To test the dashboard:

1. Start demo API: `npm run dev -w demo-api`
2. Start dashboard: `npm run dev -w dashboard`
3. Send messages to demo API to create sessions:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-user-1",
    "userMessage": "Hello, how are you?"
  }'
```

4. Refresh dashboard to see the new session appear
5. Click to view session details and CoT analysis

## Troubleshooting

### Dashboard shows "Failed to fetch sessions"

- Check that demo API is running on `http://localhost:3000`
- Check CORS settings in demo API
- Verify `VITE_API_URL` in `.env` matches your API URL

### Sessions list is empty

- Send at least one message to demo API to create a session
- Check browser console for errors
- Verify API endpoint returns correct format

### Build fails

- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors: `npm run build`

## Future Enhancements

- Real-time WebSocket updates instead of polling
- Session search and filtering
- Risk threshold configuration
- Export session data to CSV/JSON
- Dark mode support
- Multi-session comparison view
