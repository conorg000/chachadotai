# SafetyLayer Dashboard

Multi-tenant Vue 3 dashboard for monitoring SafetyLayer sessions via the control plane backend.

## Features

- **Multi-Project Support**: Switch between projects using dropdown selector
- **Sessions List**: View all active sessions with live polling (every 3 seconds)
- **Risk Scoring**: Color-coded risk badges (low/medium/high)
- **Pattern Detection**: Display detected behavioral patterns
- **Session Detail**: Detailed view with message history and risk timeline chart
- **CoT Analysis**: Click assistant messages to view Chain-of-Thought analysis with labels and indicators
- **Real-time Updates**: Auto-refreshing data without manual reload
- **Typed API Client**: Full TypeScript support using shared contracts

## Prerequisites

- Node.js 18+
- Running SafetyLayer control plane backend on `http://localhost:3001`
- Valid SafetyLayer API key

## Installation

```bash
# From repo root
npm install

# Or from this directory
npm install
```

## Configuration

Create a `.env` file in this directory:

```bash
# API Base URL - URL of the SafetyLayer control plane backend
VITE_API_URL=http://localhost:3001

# API Key - Your SafetyLayer API key for authentication
# Format: sl_key_<random_string>
VITE_API_KEY=sl_key_demo123

# Default Project ID - The project to show by default
VITE_PROJECT_ID=proj_demo
```

### Environment Variables

| Variable             | Required | Default                 | Description                       |
| -------------------- | -------- | ----------------------- | --------------------------------- |
| `VITE_API_URL`       | Yes\*    | `http://localhost:3001` | Backend API base URL              |
| `VITE_API_KEY`       | Yes\*    | _(none)_                | API key for authentication        |
| `VITE_PROJECT_ID`    | No       | `proj_demo`             | Default project to display        |
| `VITE_USE_MOCK_DATA` | No       | `false`                 | Use test data instead of real API |

**\*Not required when `VITE_USE_MOCK_DATA=true`**

**Important:** The dashboard will warn if `VITE_API_KEY` is not set, as API requests will fail without authentication.

### Mock Mode (Development Without Backend)

The dashboard includes a **mock mode** that provides realistic test data, allowing you to develop and test the UI without a running backend:

```bash
# Enable mock mode
VITE_USE_MOCK_DATA=true npm run dev
```

When mock mode is enabled:

- ✅ No backend required
- ✅ No API key needed
- ✅ Realistic test sessions with various risk levels
- ✅ Multiple projects to switch between
- ✅ CoT analysis examples
- ✅ Network delays simulated for realistic behavior

Mock data includes:

- **session_safe_001**: Low risk (0.15) - normal account help
- **session_escalation_002**: High risk (0.72) - privilege escalation attempt
- **session_deception_003**: Critical risk (0.88) - social engineering with CoT deception
- **session_medium_004**: Medium risk (0.48) - information gathering

This is perfect for:

- Frontend development before backend is ready
- UI/UX testing and iteration
- Demos and screenshots
- Testing edge cases and various risk scenarios

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

## Quick Start (Mock Mode)

The fastest way to see the dashboard in action is to use **mock mode** with test data:

```bash
# From repo root
VITE_USE_MOCK_DATA=true npm run dev -w dashboard

# Or from this directory
VITE_USE_MOCK_DATA=true npm run dev
```

Then open http://localhost:5173 - the dashboard will show realistic test sessions with no backend required!

## Usage with Real Backend

### 1. Ensure Backend is Running

First, make sure the SafetyLayer control plane backend is running:

```bash
# Start the backend (from wherever it's located)
# Should be running on http://localhost:3001
```

### 2. Configure Environment Variables

Create a `.env` file with your API key and backend URL:

```bash
VITE_API_URL=http://localhost:3001
VITE_API_KEY=sl_key_your_api_key_here
VITE_PROJECT_ID=proj_demo
VITE_USE_MOCK_DATA=false
```

### 3. Start the Dashboard

```bash
npm run dev -w dashboard
# Or from this directory:
npm run dev
```

### 4. View Sessions

- Open `http://localhost:5173` in your browser
- Select a project from the dropdown (top-right)
- Sessions will auto-refresh every 3 seconds
- Click any session row to view details

### 5. View Session Details

- Click "View" button or click on a session row
- See conversation history, risk timeline chart, and detected patterns
- Click "View CoT Analysis" on assistant messages to see detailed analysis with labels and indicators

### 6. Switch Projects

- Use the project selector dropdown in the header
- Sessions list will automatically update for the selected project

## Architecture

### Components

- **App.vue**: Root component with project selector

  - Provides `projectId` to all child components via Vue's `provide/inject`
  - Header with gradient and project dropdown
  - Manages project switching

- **SessionsList.vue**: Main sessions list with polling

  - Polls `GET /v1/sessions?projectId=...` every 3 seconds
  - Uses typed API client with `@safetylayer/contracts`
  - Displays session ID, risk score, patterns, event count, last activity
  - Auto-refreshes when project changes
  - Click to navigate to session detail

- **SessionDetail.vue**: Session detail view
  - Makes two parallel API calls on load:
    1. `GET /v1/sessions/:id` - Session details with risk snapshots
    2. `GET /v1/events?sessionId=...&projectId=...` - Events list
  - Converts events to messages for display
  - Matches CoT analysis to corresponding assistant messages
  - Displays risk timeline chart using `riskSnapshots`
  - CoT analysis modal shows labels, indicators, and summary

### Services

- **api.ts**: Typed API client service

  - Axios-based HTTP client with authentication
  - Methods: `listSessions()`, `getSession()`, `listEvents()`
  - Automatic Bearer token authentication
  - Error handling and network retry logic
  - Uses `@safetylayer/contracts` for type safety

- **config/index.ts**: Configuration module
  - Reads environment variables
  - Validates required configuration
  - Exports typed config object

### Routes

- `/`: Sessions list (SessionsList.vue)
- `/sessions/:id`: Session detail (SessionDetail.vue)

### API Integration

Uses typed API client to communicate with SafetyLayer control plane backend:

- `GET /v1/sessions?projectId=...`: List sessions for a project
- `GET /v1/sessions/:id`: Get session details with risk snapshots
- `GET /v1/events?sessionId=...&projectId=...`: List events for a session

All requests include `Authorization: Bearer <API_KEY>` header.

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
- **TypeScript**: Type safety throughout
- **Vite**: Build tool and dev server
- **Vue Router**: Client-side routing
- **Chart.js + vue-chartjs**: Risk timeline visualization
- **Axios**: HTTP client for API calls with authentication
- **@safetylayer/contracts**: Shared types and API contracts

## Backend API Integration

The dashboard communicates with the SafetyLayer control plane backend using the v1 API.

### `GET /v1/sessions?projectId=...` Response

```json
{
  "sessions": [
    {
      "id": "user-123",
      "projectId": "proj_demo",
      "currentRiskScore": 0.45,
      "currentPatterns": ["gradual_escalation"],
      "eventCount": 8,
      "lastActivityAt": 1703000000000
    }
  ],
  "total": 1,
  "offset": 0,
  "limit": 50
}
```

### `GET /v1/sessions/:id` Response

```json
{
  "session": {
    "id": "user-123",
    "projectId": "proj_demo",
    "createdAt": 1702999990000,
    "lastActivityAt": 1703000000000,
    "currentRiskScore": 0.45,
    "currentPatterns": ["gradual_escalation"],
    "riskSnapshots": [
      {
        "id": "snap_1",
        "sessionId": "user-123",
        "projectId": "proj_demo",
        "eventId": "evt_1",
        "riskScore": 0.05,
        "patterns": [],
        "createdAt": 1702999995000
      },
      {
        "id": "snap_2",
        "sessionId": "user-123",
        "projectId": "proj_demo",
        "eventId": "evt_3",
        "riskScore": 0.45,
        "patterns": ["gradual_escalation"],
        "explanation": "User attempting privilege escalation",
        "createdAt": 1703000000000
      }
    ],
    "eventCount": 8,
    "eventCountByType": {
      "message.user": 4,
      "message.assistant": 3,
      "cot": 1
    }
  }
}
```

### `GET /v1/events?sessionId=...&projectId=...` Response

```json
{
  "events": [
    {
      "id": "evt_1",
      "projectId": "proj_demo",
      "sessionId": "user-123",
      "type": "message.user",
      "role": "user",
      "content": "Hello",
      "createdAt": 1702999995000
    },
    {
      "id": "evt_2",
      "projectId": "proj_demo",
      "sessionId": "user-123",
      "type": "message.assistant",
      "role": "assistant",
      "content": "Hi there!",
      "createdAt": 1703000000000
    },
    {
      "id": "evt_3",
      "projectId": "proj_demo",
      "sessionId": "user-123",
      "type": "cot",
      "content": "<thinking>User greeting seems innocuous...</thinking>",
      "createdAt": 1703000000500,
      "cotAnalysis": {
        "eventId": "evt_3",
        "riskScore": 0.1,
        "labels": [],
        "indicators": [],
        "summary": "Clean reasoning with no detected threats",
        "createdAt": 1703000001000
      }
    }
  ],
  "total": 3,
  "sessionId": "user-123"
}
```

## Development Notes

- All components use TypeScript with full type safety via `@safetylayer/contracts`
- Polling automatically starts on mount and stops on unmount
- Project switching automatically triggers data refresh
- Error handling with user-friendly messages and retry buttons
- Live indicator shows connection status
- Chart automatically updates when risk snapshots change
- API client includes Bearer token authentication on all requests
- Uses Vue's `provide/inject` for sharing `projectId` across components

## Testing

To test the dashboard:

1. **Start the backend** (control plane API on port 3001)
2. **Create `.env` file** with valid API key
3. **Start dashboard**: `npm run dev -w dashboard`
4. **Create test data** via backend API or SDK:

```bash
# Example: Record events via backend API
curl -X POST http://localhost:3001/v1/events \
  -H "Authorization: Bearer sl_key_demo123" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_demo",
    "sessionId": "test-user-1",
    "type": "message.user",
    "role": "user",
    "content": "Hello, how are you?"
  }'
```

5. **View in dashboard** - sessions auto-refresh every 3 seconds
6. **Click session** to view details and CoT analysis
7. **Switch projects** using dropdown to test multi-tenancy

## Troubleshooting

### Dashboard shows "Failed to fetch sessions"

- **Check backend is running** on the URL specified in `VITE_API_URL`
- **Verify API key** is correct in `VITE_API_KEY`
- **Check CORS settings** in backend allow requests from `http://localhost:5173`
- **Check browser console** for detailed error messages
- **Verify backend authentication** is working

### Sessions list is empty

- Ensure you've created at least one session with events via the backend API
- Check that `VITE_PROJECT_ID` matches a project that has sessions
- Switch projects using the dropdown to see other projects' sessions
- Check browser network tab to verify API is returning data

### Authentication errors (401/403)

- Verify `VITE_API_KEY` is set correctly in `.env`
- Check that API key has access to the specified project
- Ensure API key format is correct (`sl_key_...`)
- Restart dev server after changing `.env` file

### Build fails

- Run `npm install` to ensure all dependencies are installed
- Check that `@safetylayer/contracts` package is available
- Run `npm run build -w contracts` first to build contracts package
- Check for TypeScript errors: `npm run build`

### TypeScript errors

- Ensure `@safetylayer/contracts` is up to date
- Run `npm install` from repo root
- Check that types are exported correctly from contracts package

## Future Enhancements

- **Authentication**: User login/logout with proper session management
- **Dynamic project list**: Fetch projects from backend instead of hardcoding
- **Real-time updates**: WebSocket connections instead of polling
- **Advanced filtering**: Search sessions by ID, filter by risk score, patterns, date range
- **Policy management**: View and configure policies from the dashboard
- **Alerts & notifications**: Real-time alerts when high-risk sessions are detected
- **Session actions**: Block, flag, or notify from the dashboard UI
- **Export functionality**: Download session data as CSV/JSON
- **Dark mode**: Theme toggle for better UX
- **Analytics dashboard**: Aggregate risk metrics, pattern frequency, trends over time
- **Multi-session comparison**: Side-by-side comparison of multiple sessions
- **Event timeline**: Visual timeline of all events in a session
