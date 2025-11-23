# SafetyLayer Backend

Control-plane backend service for SafetyLayer.

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose, which sets up both PostgreSQL and the backend service:

```bash
# From the project root directory
docker compose -f docker-compose.dev.yml up

# Or use the shorthand (if docker-compose.yml is configured for dev)
docker compose up
```

This will:
- Start PostgreSQL on `localhost:5432`
- Run database migrations automatically
- Seed the dev project
- Start the backend with hot reload on `http://localhost:3001`

To stop:
```bash
docker compose down

# To remove volumes (database data):
docker compose down -v
```

## Manual Setup (Without Docker)

If you prefer to run without Docker:

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb safetylayer

# Run migrations
npm run migrate

# Seed dev project (optional)
npm run seed
```

4. Start development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001`.

## API Endpoints

All endpoints (except `/health`) require authentication via `X-API-Key` header.

### Health Check
- `GET /health` - Server health check (no auth required)

### Events
- `POST /v1/events` - Record a new event
- `GET /v1/events?sessionId=<id>` - List events for a session

### Sessions
- `GET /v1/sessions?projectId=<id>` - List sessions for a project
- `GET /v1/sessions/:id` - Get session details with risk timeline

### Evaluation
- `POST /v1/evaluate` - Evaluate session for risk (stub for now)

## Development Mode

In development mode (`NODE_ENV=development`), you can use the dev API key from `.env`:

```bash
curl -H "X-API-Key: dev-key-12345" \
     -H "X-Project-Id: dev-project" \
     http://localhost:3001/v1/sessions
```

## Database Schema

The schema includes:
- `projects` - Project configuration and API keys
- `sessions` - User sessions with risk scores
- `events` - Session events (messages, tool calls, CoT, etc.)
- `risk_snapshots` - Timeline of risk assessments
- `policies` - Policy rules (for future use)

## Next Steps (Future Tickets)

- **Ticket 4**: Add SessionAnalyzerService for threat detection
- **Ticket 5**: Add CoTAnalyzerService for chain-of-thought analysis
- **Ticket 6**: Wire up analysis pipeline to event ingestion
- **Ticket 9**: Implement PolicyEngine for automated actions
