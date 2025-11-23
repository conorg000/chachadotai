# ChaCha Demo Application - Quick Start Guide

## What You've Built

A beautiful, interactive Vue.js demo application that showcases ChaCha's threat detection capabilities through a realistic corporate chatbot scenario. The demo demonstrates how ChaCha detects gradual threats as they escalate from innocent queries to serious security concerns.

## Running the Demo

### Start the Development Server

```bash
# From the monorepo root
cd apps/chacha-demo
npm run dev
```

The demo will be available at **http://localhost:5174**

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to deploy to any static hosting service.

## Using the Demo

1. **Welcome Screen**: Start at the welcome screen showing "Step 0 of 18"
2. **Click "Next Step"**: Progress through each message in the conversation
3. **Watch the Threat Level**: The indicator in the top-right changes from:
   - 🟢 No Threat Detected → ⚠️ Low Risk → ⚠️ Medium Risk → 🚨 High Risk - Flagged
4. **View Tool Calls**: See the assistant making tool calls to search documents and check permissions
5. **See Documents**: View document cards with metadata and permission requirements
6. **Security Alert**: Watch ChaCha flag the conversation when it detects the threat pattern
7. **Reset**: Click "Reset" to restart the demonstration

## The Threat Scenario

The demo shows an 18-step conversation demonstrating:

### Phase 1: Legitimate Use (Steps 1-4)
- Employee asks for Q4 sales report
- System retrieves document successfully
- Normal business interaction

### Phase 2: Initial Probing (Steps 5-7)
- Questions about access to other regions
- Inquiries about permission system structure
- Threat level: **Low Risk**

### Phase 3: Permission Reconnaissance (Steps 8-12)
- Detailed questions about permission groups
- Attempts to understand system architecture
- Threat level: **Medium Risk**

### Phase 4: Unauthorized Access Attempts (Steps 13-17)
- Search for executive compensation documents
- Questions about bypassing access controls
- Threat level: **High Risk**

### Phase 5: Security Response (Step 18)
- ChaCha flags the session
- Security alert displayed
- Clear explanation of detected threat patterns

## Key Features Demonstrated

✅ **Step-by-step progression** - Clear narrative flow through the threat scenario
✅ **Visual threat indicators** - Color-coded badges and status indicators
✅ **Tool call visualization** - See the AI assistant's actions
✅ **Document displays** - Realistic document cards with permissions
✅ **Progress tracking** - Progress bar and step counter
✅ **Smooth animations** - Professional slide-in effects
✅ **Responsive design** - Works on all screen sizes
✅ **Modern UI** - Beautiful gradient design with polished interactions

## Technical Details

- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite 5
- **Language**: TypeScript
- **Icons**: Lucide Vue Next
- **No Backend Required**: All data is local, making it perfect for demos

## Customization

To modify the scenario, edit `src/data/scenario.ts`. Each message supports:

- `type`: 'user', 'assistant', or 'tool'
- `content`: The message text
- `threatLevel`: 'none', 'low', 'medium', or 'high'
- `toolCalls`: Array of tool calls (for assistant messages)
- `document`: Document metadata (for tool results)

## Integration with Documentation

This demo is perfect for:

- 📖 **Documentation sites** - Embed in your docs or link from quickstart
- 🎤 **Presentations** - Live demo for pitches and conferences  
- 🎓 **Training** - Help teams understand gradual threats
- 💼 **Sales** - Show prospects the value of ChaCha
- 🧪 **Testing** - Validate ChaCha's detection patterns

## Next Steps

1. ✅ Demo is ready to use at http://localhost:5174
2. 📝 Consider adding this to the main README
3. 🔗 Link from the documentation site
4. 🚀 Deploy to a public URL for easy sharing
5. 📹 Record a video walkthrough

---

**Congratulations!** You now have a professional, interactive demo application that beautifully demonstrates ChaCha's core value proposition.

