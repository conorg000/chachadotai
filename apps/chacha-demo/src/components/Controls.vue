<template>
  <div class="controls">
    <div class="progress-section">
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
      </div>
      <div class="progress-text">
        <span class="step-counter">Step {{ currentStep }} of {{ totalSteps }}</span>
        <span class="progress-percentage">{{ progressPercentage }}%</span>
      </div>
    </div>
    
    <div class="buttons-section">
      <button 
        class="control-button button-secondary"
        @click="$emit('reset')"
        :disabled="currentStep === 0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        Reset
      </button>
      
      <button 
        class="control-button button-primary"
        @click="$emit('next')"
        :disabled="isComplete"
      >
        Next Step
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  next: [];
  reset: [];
  autoPlay: [];
}>();

const progressPercentage = computed(() => {
  if (props.totalSteps === 0) return 0;
  return Math.round((props.currentStep / props.totalSteps) * 100);
});
</script>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.progress-bar-container {
  height: 8px;
  background: var(--gray-200);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%);
  transition: width 0.4s ease-out;
  border-radius: 4px;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-counter {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-700);
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-500);
}

.buttons-section {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.button-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.button-primary:active:not(:disabled) {
  transform: translateY(0);
}

.button-secondary {
  background: white;
  color: var(--gray-700);
  border: 2px solid var(--gray-300);
}

.button-secondary:hover:not(:disabled) {
  background: var(--gray-50);
  border-color: var(--gray-400);
}

.button-secondary:active:not(:disabled) {
  background: var(--gray-100);
}

@media (max-width: 768px) {
  .buttons-section {
    flex-direction: column;
  }
  
  .control-button {
    width: 100%;
    justify-content: center;
  }
}
</style>

