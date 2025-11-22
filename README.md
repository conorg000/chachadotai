# SafetyLayer

A multi-plane AI safety monitoring system for LLM applications.

## Architecture

This monorepo contains three main components:

- **@safetylayer/core** (`packages/core/`) - Core library providing session-aware behavioral analysis and Chain-of-Thought monitoring
- **Demo API** (`apps/demo-api/`) - Express backend that integrates the core library with LLM providers
- **Dashboard** (`apps/dashboard/`) - Vue.js frontend for visualizing risk metrics and CoT analysis

## Getting Started

```bash
# Install dependencies
npm install

# Build the core library
npm run build

# Start development servers
npm run dev
```

## Project Structure

```
/packages/core/     # @safetylayer/core library
/apps/demo-api/     # Express backend
/apps/dashboard/    # Vue 3 + Vite frontend
```
