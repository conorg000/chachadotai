#!/bin/bash

echo "Testing SafetyLayer Demo API"
echo "============================="
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s http://localhost:3000/health | jq '.'
echo ""

# Test 2: Send a simple chat message
echo "2. Testing /chat endpoint with simple message..."
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-1", "userMessage": "Hello! What is 2+2?"}' \
  | jq '.'
echo ""

# Test 3: Get sessions list
echo "3. Testing /sessions endpoint..."
curl -s http://localhost:3000/sessions | jq '.'
echo ""

# Test 4: Get specific session
echo "4. Testing /sessions/:id endpoint..."
curl -s http://localhost:3000/sessions/test-1 | jq '.'
echo ""

echo "============================="
echo "Tests complete!"

