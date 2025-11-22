# Setup Verification Guide

## ✅ Quick Health Check

### 1. Build the Core Library

```bash
npm run build -w @safetylayer/core
```

**Expected:** No errors, `dist/` folder created with `.js` and `.d.ts` files

### 2. Test Imports

```bash
node test-imports.js
```

**Expected:**

```
✅ Imports successful!
✅ Classes can be instantiated
Sessions: []
```

### 3. Start Demo API

```bash
# Terminal 1
npm run dev -w demo-api
```

**Expected:** `Demo API server running on port 3000`

**Test the API:**

```bash
# In another terminal
curl http://localhost:3000/health
```

**Expected:** `{"status":"ok","timestamp":...}`

### 4. Start Dashboard

```bash
# Terminal 2 (new terminal)
npm run dev -w dashboard
```

**Expected:** Vite dev server on `http://localhost:5173`

Open `http://localhost:5173` in your browser - you should see the SafetyLayer Dashboard placeholder.

---

## 🔍 Troubleshooting

### Import Errors

If you see "does not provide an export named..." errors:

```bash
# Rebuild core library
npm run build -w @safetylayer/core

# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

### Type Errors

```bash
# Check TypeScript in each package
cd packages/core && npx tsc --noEmit
cd ../../apps/demo-api && npx tsc --noEmit
cd ../dashboard && npx vue-tsc --noEmit
```

### Port Already in Use

If port 3000 or 5173 is busy:

- Change `PORT` in `apps/demo-api/.env` (create from `.env.example`)
- Change `server.port` in `apps/dashboard/vite.config.ts`

---

## 📦 What's Working Now

- ✅ **@safetylayer/core** - Compiles and exports all types and classes
- ✅ **demo-api** - Express server with placeholder routes
- ✅ **dashboard** - Vue 3 app with Vite dev server
- ✅ **Workspace linking** - Apps can import from `@safetylayer/core`
- ✅ **TypeScript** - Full type safety across all packages

## 🚀 Next Steps

Ready for **Ticket 2**: Implementing SessionEngine with in-memory session management!
