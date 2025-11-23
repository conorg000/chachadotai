# SafetyLayer

A multi-plane AI safety monitoring system for LLM applications.

## 📚 Documentation

**[View Full Documentation →](http://localhost:3000)**

Run the documentation site locally:

```bash
npm run docs:dev
```

The comprehensive documentation includes:
- 🚀 Quick start guide
- 📖 Complete API reference
- 🔧 Integration guides
- 🧪 Testing strategies
- 🎯 Live demo walkthrough

## Architecture

This monorepo contains the following components:

### Current Architecture (Transformation in Progress)

- **@safetylayer/contracts** (`packages/contracts/`) - Shared TypeScript types and API contracts
- **Backend API** (`apps/backend/`) - **NEW** Control-plane backend with PostgreSQL
- **@safetylayer/core** (`packages/core/`) - Legacy core library (being migrated)
- **Demo API** (`apps/demo-api/`) - Legacy demo backend (being replaced)
- **Dashboard** (`apps/dashboard/`) - Vue.js frontend for visualizing risk metrics

### Transformation Status

We are currently migrating from a monolithic SDK to a client-server architecture:
- ✅ **Ticket 1**: Shared contracts defined
- ✅ **Ticket 2**: Backend skeleton + RDS schema implemented
- ⏳ **Next**: SDK refactor, analysis services, dashboard integration

See [chacha_transformation_tickets.md](chacha_transformation_tickets.md) for details.

## Quick Start

### Option 1: Docker Compose (Recommended)

The easiest way to run the new backend with PostgreSQL:

```bash
# Start PostgreSQL + Backend API
docker-compose -f docker-compose.dev.yml up

# The backend will be available at http://localhost:3001
# PostgreSQL will be available at localhost:5432
```

See [DOCKER.md](DOCKER.md) for detailed Docker setup instructions.

### Option 2: Manual Setup

```bash
# Install dependencies
npm install

# Build the core library
npm run build -w @safetylayer/core

# Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_KEY

# Start demo API
npm run dev -w demo-api

# Start dashboard (optional)
npm run dev -w dashboard

# View documentation
npm run docs:dev
```

## The Two-Plane Approach

SafetyLayer monitors AI safety across two complementary planes:

1. **Behavioral Plane** - Tracks risk across multi-turn conversations
   - Session-aware analysis
   - Pattern detection (escalation, reconnaissance, social engineering)
   - Risk scoring and timelines

2. **CoT Monitoring Plane** - Analyzes LLM reasoning processes
   - Deception detection
   - Goal drift analysis
   - Policy evasion detection

## Project Structure

```
/packages/core/     # @safetylayer/core library
/apps/demo-api/     # Express backend demo
/apps/dashboard/    # Vue 3 + Vite frontend
/docs/              # Mintlify documentation
```

## Learn More

- 📖 [Full Documentation](http://localhost:3000) - Complete guides and API reference
- 🎯 [Quick Start Guide](http://localhost:3000/quickstart) - Get up and running in 5 minutes
- 🏗️ [Architecture Overview](http://localhost:3000/architecture) - Deep dive into the system design
- 🧪 [Demo & Examples](http://localhost:3000/demo/running-demo) - Try it yourself
