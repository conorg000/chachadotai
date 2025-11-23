<template>
  <div class="tool-call">
    <div class="tool-call-header">
      <span class="tool-call-icon">🔧</span>
      <span class="tool-call-name">{{ toolCall.name }}</span>
    </div>
    <div class="tool-call-params">
      <div v-for="(value, key) in toolCall.parameters" :key="key" class="param-row">
        <span class="param-key">{{ key }}:</span>
        <span class="param-value">{{ formatValue(value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolCall as ToolCallType } from '../types';

interface Props {
  toolCall: ToolCallType;
}

defineProps<Props>();

const formatValue = (value: any): string => {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
</script>

<style scoped>
.tool-call {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: 1px solid var(--gray-300);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 0.75rem;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.tool-call-icon {
  font-size: 1.125rem;
}

.tool-call-name {
  font-family: 'Courier New', monospace;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--gray-800);
}

.tool-call-params {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1.75rem;
}

.param-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
}

.param-key {
  color: var(--gray-600);
  font-weight: 600;
}

.param-value {
  color: var(--gray-800);
  word-break: break-word;
}
</style>

