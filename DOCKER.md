# Docker Setup Guide

This guide explains how to run SafetyLayer using Docker Compose.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd chachadotai
```

2. Start the services:
```bash
docker-compose -f docker-compose.dev.yml up
```

This will start:
- **PostgreSQL** on port 5432
- **Backend API** on port 3001

The first startup will:
- Install all dependencies
- Build the contracts package
- Run database migrations
- Seed a development project
- Start the backend with hot reload

## Service URLs

- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
  - Database: `safetylayer`
  - User: `postgres`
  - Password: `postgres`

## Common Commands

### Start services
```bash
docker-compose -f docker-compose.dev.yml up
```

### Start in background (detached mode)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### View logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend-dev
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Stop services
```bash
docker-compose -f docker-compose.dev.yml down
```

### Stop and remove data volumes
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### Rebuild containers
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Run commands inside containers
```bash
# Access backend container shell
docker-compose -f docker-compose.dev.yml exec backend-dev sh

# Run migration manually
docker-compose -f docker-compose.dev.yml exec backend-dev npm run migrate

# Access PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d safetylayer
```

## Testing the API

Once the services are running, test the API:

```bash
# Health check
curl http://localhost:3001/health

# List sessions (requires dev API key)
curl -H "X-API-Key: dev-key-12345" \
     -H "X-Project-Id: dev-project" \
     http://localhost:3001/v1/sessions

# Or use the test script
cd apps/backend
./test-api.sh
```

## Development Workflow

The development setup includes hot reload:

1. Edit files in `apps/backend/src/` or `packages/contracts/src/`
2. Changes are automatically detected
3. The backend restarts automatically

## Troubleshooting

### Port already in use

If you get an error about ports 3001 or 5432 already being in use:

```bash
# Find and stop the process using the port
lsof -ti:3001 | xargs kill -9
lsof -ti:5432 | xargs kill -9
```

### Database connection issues

If the backend can't connect to PostgreSQL:

1. Check if PostgreSQL is healthy:
```bash
docker-compose -f docker-compose.dev.yml ps
```

2. Restart the services:
```bash
docker-compose -f docker-compose.dev.yml restart
```

### Reset database

To start fresh with a clean database:

```bash
# Stop and remove volumes
docker-compose -f docker-compose.dev.yml down -v

# Start again (will recreate database)
docker-compose -f docker-compose.dev.yml up
```

### Build issues

If you encounter build issues:

```bash
# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache

# Start fresh
docker-compose -f docker-compose.dev.yml up --force-recreate
```

## Production Deployment

For production, use `docker-compose.yml` (without the `.dev` suffix):

```bash
docker-compose up -d
```

This uses the production Dockerfile which:
- Creates optimized builds
- Installs only production dependencies
- Doesn't include hot reload

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Network          │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  PostgreSQL  │    │   Backend    │  │
│  │   Container  │◄───│   Container  │  │
│  │              │    │              │  │
│  │  Port: 5432  │    │  Port: 3001  │  │
│  └──────────────┘    └──────────────┘  │
│         │                    │          │
└─────────┼────────────────────┼──────────┘
          │                    │
          │                    │
     (volume)              (host port)
          │                    │
          ▼                    ▼
   postgres_data_dev      localhost:3001
```

## Files

- `docker-compose.yml` - Production configuration
- `docker-compose.dev.yml` - Development configuration with hot reload
- `apps/backend/Dockerfile` - Production Docker image
- `apps/backend/Dockerfile.dev` - Development Docker image
- `apps/backend/.dockerignore` - Files to exclude from Docker context
