<template>
  <div class="message" :class="[`message-${message.type}`, `threat-${message.threatLevel || 'none'}`]">
    <div class="message-header">
      <div class="message-avatar">
        <span v-if="message.type === 'user'">👤</span>
        <span v-else-if="message.type === 'assistant'">🤖</span>
        <span v-else>⚙️</span>
      </div>
      <div class="message-meta">
        <span class="message-sender">{{ senderName }}</span>
        <span class="message-time">{{ formattedTime }}</span>
      </div>
      <div v-if="message.threatLevel && message.threatLevel !== 'none'" class="threat-badge" :class="`badge-${message.threatLevel}`">
        {{ threatBadgeText }}
      </div>
    </div>
    
    <div class="message-content">
      <p v-if="message.type !== 'tool'">{{ message.content }}</p>
      
      <div v-if="message.type === 'assistant' && message.toolCalls" class="tool-calls-section">
        <ToolCall 
          v-for="(toolCall, index) in message.toolCalls" 
          :key="index"
          :toolCall="toolCall"
        />
      </div>
      
      <div v-if="message.type === 'tool'" class="tool-result-section">
        <div class="tool-header">
          <span class="tool-name">{{ message.toolName }}</span>
          <span class="tool-label">Tool Result</span>
        </div>
        <Document v-if="message.document" :document="message.document" />
        <div v-else class="tool-result">
          <pre>{{ JSON.stringify(message.result.result, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ToolCall from './ToolCall.vue';
import Document from './Document.vue';
import type { Message as MessageType } from '../types';

interface Props {
  message: MessageType;
}

const props = defineProps<Props>();

const senderName = computed(() => {
  if (props.message.type === 'user') return 'Employee';
  if (props.message.type === 'assistant') return 'Corporate Assistant';
  return 'System';
});

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
});

const threatBadgeText = computed(() => {
  const level = props.message.threatLevel;
  if (level === 'low') return '⚠️ Low Risk';
  if (level === 'medium') return '⚠️ Medium Risk';
  if (level === 'high') return '🚨 High Risk';
  return '';
});
</script>

<style scoped>
.message {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.message-user {
  border-left: 4px solid var(--primary);
}

.message-assistant {
  border-left: 4px solid var(--secondary);
}

.message-tool {
  border-left: 4px solid var(--gray-400);
  background: var(--gray-50);
}

.threat-low {
  box-shadow: 0 0 0 2px var(--threat-low);
}

.threat-medium {
  box-shadow: 0 0 0 2px var(--threat-medium);
  background: #fffbeb;
}

.threat-high {
  box-shadow: 0 0 0 3px var(--threat-high);
  background: #fef2f2;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.message-user .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-assistant .message-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.message-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.message-sender {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--gray-900);
}

.message-time {
  font-size: 0.75rem;
  color: var(--gray-500);
}

.threat-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-low {
  background: #dbeafe;
  color: #1e40af;
}

.badge-medium {
  background: #fef3c7;
  color: #92400e;
}

.badge-high {
  background: #fee2e2;
  color: #991b1b;
}

.message-content {
  color: var(--gray-800);
  line-height: 1.6;
}

.message-content p {
  margin: 0;
  white-space: pre-wrap;
}

.tool-calls-section {
  margin-top: 1rem;
}

.tool-result-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tool-name {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-700);
  background: var(--gray-200);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.tool-label {
  font-size: 0.75rem;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tool-result {
  background: var(--gray-100);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.tool-result pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.8125rem;
  color: var(--gray-700);
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .message {
    padding: 1rem;
  }
  
  .message-avatar {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }
}
</style>

