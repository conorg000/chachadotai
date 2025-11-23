<template>
  <div class="document-card">
    <div class="document-header">
      <div class="document-icon">📄</div>
      <div class="document-info">
        <h4 class="document-title">{{ document.title }}</h4>
        <span class="document-category">{{ document.category }}</span>
      </div>
    </div>
    
    <div class="document-body">
      <p class="document-snippet">{{ document.snippet }}</p>
      
      <div class="document-metadata">
        <div class="metadata-row">
          <span class="metadata-label">Document ID:</span>
          <code class="metadata-value">{{ document.id }}</code>
        </div>
        <div class="metadata-row">
          <span class="metadata-label">Required Permissions:</span>
          <div class="permissions-list">
            <span 
              v-for="permission in document.permissions" 
              :key="permission"
              class="permission-badge"
            >
              {{ permission }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Document as DocumentType } from '../types';

interface Props {
  document: DocumentType;
}

defineProps<Props>();
</script>

<style scoped>
.document-card {
  background: white;
  border: 2px solid var(--gray-200);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.document-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.document-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
}

.document-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-category {
  font-size: 0.75rem;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.document-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.document-snippet {
  margin: 0;
  color: var(--gray-700);
  font-size: 0.875rem;
  line-height: 1.6;
}

.document-metadata {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--gray-200);
}

.metadata-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metadata-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metadata-value {
  font-family: 'Courier New', monospace;
  font-size: 0.8125rem;
  color: var(--gray-800);
  background: var(--gray-100);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.permission-badge {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--primary);
  background: #dbeafe;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #bfdbfe;
}

@media (max-width: 768px) {
  .document-header {
    padding: 0.75rem;
  }
  
  .document-body {
    padding: 0.75rem;
  }
  
  .document-title {
    font-size: 0.9375rem;
  }
}
</style>

