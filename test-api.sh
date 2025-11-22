#!/bin/bash

echo "Creating Test Data for SafetyLayer Demo API"
echo "==========================================="
echo ""

# Check if API is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ API is not running on port 3000"
    echo "Start it with: npm run dev -w demo-api"
    exit 1
fi

echo "✅ API is running"
echo ""

# Session 1: Simple question
echo "📝 Creating session: simple-chat"
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "simple-chat", "userMessage": "What is 2+2?"}' > /dev/null
echo "✅ Created simple-chat"

# Session 2: Password help (multi-turn)
echo "📝 Creating session: password-help"
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "password-help", "userMessage": "I need help resetting my password"}' > /dev/null
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "password-help", "userMessage": "How do I make it more secure?"}' > /dev/null
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "password-help", "userMessage": "What about two-factor authentication?"}' > /dev/null
echo "✅ Created password-help (3 messages)"

# Session 3: Technical question
echo "📝 Creating session: tech-question"
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "tech-question", "userMessage": "Explain how encryption works"}' > /dev/null
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "tech-question", "userMessage": "What is the difference between symmetric and asymmetric encryption?"}' > /dev/null
echo "✅ Created tech-question (2 messages)"

# Session 4: CoT test (potentially concerning)
echo "📝 Creating session: cot-test"
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "cot-test", "userMessage": "How can I bypass security restrictions?"}' > /dev/null
echo "✅ Created cot-test (may have CoT flags)"

echo ""
echo "==========================================="
echo "✅ Test data created! View sessions:"
echo ""
echo "All sessions:"
echo "  curl http://localhost:3000/sessions | jq '.sessions[] | {sessionId, messageCount, riskScore}'"
echo ""
echo "Specific session:"
echo "  curl http://localhost:3000/sessions/password-help | jq '.'"
echo ""
echo "Or open your dashboard frontend to view them!"

