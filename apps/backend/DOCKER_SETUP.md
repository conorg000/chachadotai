# Docker Setup for SafetyLayer Backend

This document explains the Docker setup added to Ticket 2 implementation.

## What Was Added

### Docker Files

1. **[docker-compose.yml](/docker-compose.yml)** (Root)
   - Production configuration
   - PostgreSQL + Backend API
   - Optimized builds

2. **[docker-compose.dev.yml](/docker-compose.dev.yml)** (Root)
   - Development configuration with hot reload
   - Volume mounts for live code changes
   - Auto-migration and seeding on startup

3. **[apps/backend/Dockerfile](Dockerfile)**
   - Multi-stage production build
   - Optimized image size
   - Production-only dependencies

4. **[apps/backend/Dockerfile.dev](Dockerfile.dev)**
   - Development image
   - Includes dev dependencies
   - Supports hot reload

5. **[apps/backend/.dockerignore](.dockerignore)**
   - Excludes unnecessary files from Docker context

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Network          │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  PostgreSQL  │    │   Backend    │  │
│  │              │◄───│   Node.js    │  │
│  │  postgres:16 │    │   Alpine     │  │
│  │              │    │   + tsx      │  │
│  │  Port: 5432  │    │  Port: 3001  │  │
│  └──────────────┘    └──────────────┘  │
│         │                    │          │
└─────────┼────────────────────┼──────────┘
          │                    │
     Volume mount          Host port
          │                    │
          ▼                    ▼
   postgres_data_dev      localhost:3001
```

## Key Features

### 1. Automatic Setup
On first start, the backend container automatically:
- Installs dependencies
- Builds the contracts package
- Runs database migrations
- Seeds development project
- Starts the server with hot reload

### 2. Hot Reload in Development
Changes to these files trigger automatic restart:
- `apps/backend/src/**/*.ts`
- `packages/contracts/src/**/*.ts`

### 3. Persistent Database
Database data is stored in a Docker volume:
- Volume name: `postgres_data_dev` (dev) or `postgres_data` (prod)
- Data persists between container restarts
- Can be removed with `docker-compose down -v`

### 4. Health Checks
PostgreSQL includes health checks:
- Backend waits for PostgreSQL to be healthy before starting
- Prevents connection errors on startup

## Usage

### Start Everything
```bash
# Development with hot reload
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend-dev
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Run Commands Inside Containers
```bash
# Access backend shell
docker-compose -f docker-compose.dev.yml exec backend-dev sh

# Run migration
docker-compose -f docker-compose.dev.yml exec backend-dev npm run migrate

# Access PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d safetylayer
```

### Stop and Clean Up
```bash
# Stop services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (database data)
docker-compose -f docker-compose.dev.yml down -v

# Rebuild from scratch
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up --force-recreate
```

## Testing

After starting the services:

```bash
# Health check
curl http://localhost:3001/health

# List sessions
curl -H "X-API-Key: dev-key-12345" \
     -H "X-Project-Id: dev-project" \
     http://localhost:3001/v1/sessions

# Run test script
cd apps/backend
./test-api.sh
```

## Environment Variables

The docker-compose files set these environment variables:

```yaml
NODE_ENV: development
PORT: 3001
DB_HOST: postgres          # Container name, not localhost
DB_PORT: 5432
DB_NAME: safetylayer
DB_USER: postgres
DB_PASSWORD: postgres
DEV_API_KEY: dev-key-12345
```

## Troubleshooting

### Port Already in Use
```bash
# Kill processes using ports 3001 or 5432
lsof -ti:3001 | xargs kill -9
lsof -ti:5432 | xargs kill -9
```

### Database Connection Issues
```bash
# Check PostgreSQL health
docker-compose -f docker-compose.dev.yml ps

# Restart services
docker-compose -f docker-compose.dev.yml restart
```

### Reset Database
```bash
# Remove volume and recreate
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up
```

### Build Errors
```bash
# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache

# Force recreate containers
docker-compose -f docker-compose.dev.yml up --force-recreate
```

## Differences: Development vs Production

| Feature | Development | Production |
|---------|------------|------------|
| Dockerfile | `Dockerfile.dev` | `Dockerfile` |
| Dependencies | All (dev + prod) | Production only |
| Build optimization | None | Multi-stage build |
| Hot reload | ✅ Yes | ❌ No |
| Volume mounts | ✅ Source code | ❌ None |
| Image size | Larger | Smaller |
| Startup command | `npm run dev` | `node dist/index.js` |

## Benefits of Docker Setup

1. **No Local PostgreSQL Required**: Everything runs in containers
2. **Consistent Environment**: Same setup for all developers
3. **Easy Cleanup**: `docker-compose down -v` removes everything
4. **Hot Reload**: Changes reflected immediately
5. **Isolated**: Doesn't interfere with other local services
6. **Fast Setup**: Single command to start everything
7. **Production-Ready**: Same images can be deployed

## Next Steps

- Add dashboard to docker-compose
- Add Redis for caching (if needed in future tickets)
- Configure production secrets management
- Set up Docker multi-stage builds for smaller images
- Add health checks to backend service
