<template>
  <div class="chat-interface">
    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>Welcome to the ChaCha Demo</h3>
        <p>Click "Next" to begin the demonstration</p>
      </div>
      
      <div v-for="message in messages" :key="message.id" class="message-wrapper slide-in">
        <Message 
          :message="message"
        />
      </div>
      
      <div v-if="isComplete" class="completion-message fade-in">
        <div class="completion-card">
          <div class="completion-icon">✅</div>
          <h3>Demo Complete</h3>
          <p>ChaCha successfully detected and flagged the gradual threat pattern. The system identified:</p>
          <ul>
            <li>Systematic permission structure probing</li>
            <li>Unauthorized document access attempts</li>
            <li>Questions about bypassing access controls</li>
          </ul>
          <p class="completion-note">Click "Reset" to view the demonstration again.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import Message from './Message.vue';
import type { Message as MessageType } from '../types';

interface Props {
  messages: MessageType[];
  isComplete: boolean;
}

const props = defineProps<Props>();
const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
};

watch(() => props.messages.length, () => {
  scrollToBottom();
});

watch(() => props.isComplete, (newValue) => {
  if (newValue) {
    scrollToBottom();
  }
});
</script>

<style scoped>
.chat-interface {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--gray-50);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--gray-500);
  padding: 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
}

.empty-state p {
  font-size: 1rem;
  color: var(--gray-500);
}

.message-wrapper {
  animation: slideInUp 0.4s ease-out;
}

.completion-message {
  margin-top: 2rem;
}

.completion-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.completion-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.completion-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.completion-card p {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1rem;
  opacity: 0.95;
}

.completion-card ul {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.completion-card li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.completion-card li::before {
  content: '→';
  position: absolute;
  left: 0;
  font-weight: bold;
}

.completion-note {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.875rem;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .messages-container {
    padding: 1rem;
    gap: 1rem;
  }
  
  .completion-card {
    padding: 1.5rem;
  }
}
</style>

