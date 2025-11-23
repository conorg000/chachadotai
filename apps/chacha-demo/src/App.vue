<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo-icon">🔒</div>
          <div>
            <h1 class="title">ChaCha Demo</h1>
            <p class="subtitle">Detecting Gradual Threats in Real-Time</p>
          </div>
        </div>
        <div class="threat-indicator" :class="`threat-${currentThreatLevel}`">
          <div class="threat-dot"></div>
          <span class="threat-label">{{ threatLabel }}</span>
        </div>
      </div>
    </header>
    
    <main class="app-main">
      <ChatInterface 
        :messages="visibleMessages" 
        :isComplete="isComplete"
      />
    </main>
    
    <footer class="app-footer">
      <Controls 
        :currentStep="currentStep"
        :totalSteps="totalSteps"
        :isComplete="isComplete"
        @next="handleNext"
        @reset="handleReset"
        @autoPlay="handleAutoPlay"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ChatInterface from './components/ChatInterface.vue';
import Controls from './components/Controls.vue';
import { scenario } from './data/scenario';

const currentStep = ref(0);
const totalSteps = computed(() => scenario.messages.length);
const isComplete = computed(() => currentStep.value >= totalSteps.value);

const visibleMessages = computed(() => {
  return scenario.messages.slice(0, currentStep.value);
});

const currentThreatLevel = computed(() => {
  if (currentStep.value === 0) return 'none';
  const lastMessage = visibleMessages.value[visibleMessages.value.length - 1];
  return lastMessage?.threatLevel || 'none';
});

const threatLabel = computed(() => {
  const labels = {
    none: 'No Threat Detected',
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk - Flagged'
  };
  return labels[currentThreatLevel.value];
});

const handleNext = () => {
  if (!isComplete.value) {
    currentStep.value++;
  }
};

const handleReset = () => {
  currentStep.value = 0;
};

const handleAutoPlay = () => {
  // TODO: Implement auto-play functionality
  console.log('Auto-play not yet implemented');
};
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-icon {
  font-size: 2.5rem;
  background: rgba(255, 255, 255, 0.2);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.subtitle {
  font-size: 0.875rem;
  opacity: 0.9;
  margin: 0.25rem 0 0;
}

.threat-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.threat-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.threat-none .threat-dot {
  background: var(--threat-none);
}

.threat-low .threat-dot {
  background: var(--threat-low);
}

.threat-medium .threat-dot {
  background: var(--threat-medium);
}

.threat-high .threat-dot {
  background: var(--threat-high);
  animation: pulse 1s ease-in-out infinite;
}

.threat-label {
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.app-main {
  flex: 1;
  overflow: hidden;
  background: var(--gray-50);
}

.app-footer {
  background: white;
  border-top: 1px solid var(--gray-200);
  padding: 1.5rem 2rem;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .app-header {
    padding: 1rem;
  }
  
  .app-footer {
    padding: 1rem;
  }
}
</style>

