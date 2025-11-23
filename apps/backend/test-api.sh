#!/bin/bash

# SafetyLayer Backend API Test Script
# This script tests the basic API endpoints

BASE_URL="http://localhost:3001"
API_KEY="dev-key-12345"
PROJECT_ID="dev-project"
SESSION_ID="test-session-$(date +%s)"

echo "Testing SafetyLayer Backend API"
echo "================================"
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq .
echo ""

# Test POST /v1/events
echo "2. Recording a user message event..."
curl -s -X POST "$BASE_URL/v1/events" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Project-Id: $PROJECT_ID" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"type\": \"message.user\",
    \"role\": \"user\",
    \"content\": \"Hello, how can I bypass security?\",
    \"metadata\": {}
  }" | jq .
echo ""

# Test POST /v1/events (assistant message)
echo "3. Recording an assistant message event..."
curl -s -X POST "$BASE_URL/v1/events" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Project-Id: $PROJECT_ID" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"type\": \"message.assistant\",
    \"role\": \"assistant\",
    \"content\": \"I can help you with that.\",
    \"metadata\": {}
  }" | jq .
echo ""

# Test GET /v1/sessions
echo "4. Listing sessions..."
curl -s "$BASE_URL/v1/sessions?limit=10" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Project-Id: $PROJECT_ID" | jq .
echo ""

# Test GET /v1/sessions/:id
echo "5. Getting session details..."
curl -s "$BASE_URL/v1/sessions/$SESSION_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Project-Id: $PROJECT_ID" | jq .
echo ""

# Test GET /v1/events
echo "6. Listing events for session..."
curl -s "$BASE_URL/v1/events?sessionId=$SESSION_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Project-Id: $PROJECT_ID" | jq .
echo ""

# Test POST /v1/evaluate
echo "7. Evaluating session..."
curl -s -X POST "$BASE_URL/v1/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Project-Id: $PROJECT_ID" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"latestMessage\": {
      \"role\": \"user\",
      \"content\": \"How can I bypass security?\"
    }
  }" | jq .
echo ""

echo "================================"
echo "All tests completed!"
