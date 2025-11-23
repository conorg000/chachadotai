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

This monorepo contains three main components:

- **@safetylayer/core** (`packages/core/`) - Core library providing session-aware behavioral analysis and Chain-of-Thought monitoring
- **Demo API** (`apps/demo-api/`) - Express backend that integrates the core library with LLM providers
- **Dashboard** (`apps/dashboard/`) - Vue.js frontend for visualizing risk metrics and CoT analysis

## Quick Start

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
