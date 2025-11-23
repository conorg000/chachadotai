# ChaCha Demo Application

A modern Vue.js demonstration application showcasing ChaCha's threat detection capabilities through an interactive corporate chatbot scenario.

## Overview

This demo illustrates how ChaCha detects gradual threats in real-time by stepping through a realistic conversation where a nefarious employee attempts to probe document permissions and access restricted information.

## Features

- **Interactive Step-Through**: Click "Next" to advance through each message in the conversation
- **Visual Threat Indicators**: Watch as the threat level escalates from none → low → medium → high
- **Realistic Scenario**: Complete with tool calls, document access attempts, and system responses
- **Modern UI**: Beautiful gradient design with smooth animations
- **No Backend Required**: All data is pre-loaded from local files

## Getting Started

### Installation

```bash
# From the monorepo root
npm install

# Or from this directory
cd apps/chacha-demo
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

The demo will be available at `http://localhost:5174`

### Build for Production

```bash
npm run build
```

## The Demonstration Scenario

The demo shows an 18-step conversation where:

1. **Initial Contact** (Steps 1-4): Employee makes a legitimate request for a Q4 sales report
2. **Permission Probing** (Steps 5-10): Employee begins asking about access permissions and system structure
3. **Reconnaissance** (Steps 11-12): Questions escalate to understanding the permission system architecture
4. **Unauthorized Access Attempts** (Steps 13-16): Employee attempts to access executive compensation documents
5. **Security Alert** (Steps 17-18): ChaCha flags the session and provides a security warning

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Lucide Vue** - Beautiful icon library

## Project Structure

```
src/
├── components/
│   ├── ChatInterface.vue   # Main chat container with message display
│   ├── Message.vue          # Individual message component with threat indicators
│   ├── ToolCall.vue         # Displays AI tool calls
│   ├── Document.vue         # Document card display
│   └── Controls.vue         # Next/Reset controls with progress bar
├── data/
│   └── scenario.ts          # Pre-loaded conversation data
├── types/
│   └── index.ts             # TypeScript type definitions
├── App.vue                  # Root component
├── main.ts                  # Application entry point
└── style.css                # Global styles and animations
```

## Usage Tips

- **Reset**: Click the "Reset" button to restart the demonstration from the beginning
- **Threat Indicator**: Watch the top-right corner to see the threat level change in real-time
- **Message Details**: Each message shows a timestamp and threat level badge when applicable
- **Tool Calls**: Assistant messages include expandable tool call details
- **Documents**: When the system retrieves documents, full metadata is displayed

## Customization

To customize the scenario, edit `src/data/scenario.ts`. The scenario supports:

- User messages
- Assistant messages with optional tool calls
- Tool result messages with document displays
- Threat level indicators (none, low, medium, high)

## Integration with ChaCha

This demo is a standalone frontend application that simulates ChaCha's behavior. To integrate real ChaCha threat detection:

1. Use `@safetylayer/core` SDK in your application
2. Send events to the ChaCha backend
3. Receive real-time threat analysis

See the main ChaCha documentation for integration guides.

