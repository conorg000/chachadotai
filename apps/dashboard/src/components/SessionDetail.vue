<template>
  <div class="session-detail">
    <div class="header">
      <button @click="goBack" class="back-button">← Back to Sessions</button>
      <h2>Session: {{ sessionId }}</h2>
      <div class="status">
        <span class="risk-badge" :class="getRiskClass(sessionDetail?.currentRiskScore || 0)">
          Risk: {{ (sessionDetail?.currentRiskScore || 0).toFixed(2) }}
        </span>
      </div>
    </div>

    <div v-if="loading && !sessionDetail" class="loading">
      Loading session...
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchSession">Retry</button>
    </div>

    <div v-else-if="sessionDetail" class="content">
      <!-- Risk Timeline Chart -->
      <div class="chart-section">
        <h3>Risk Timeline</h3>
        <div class="chart-container">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Patterns Summary -->
      <div v-if="sessionDetail.currentPatterns?.length > 0" class="patterns-section">
        <h3>Detected Patterns</h3>
        <div class="patterns">
          <span
            v-for="pattern in sessionDetail.currentPatterns"
            :key="pattern"
            class="pattern-tag"
          >
            {{ pattern }}
          </span>
        </div>
      </div>

      <!-- Messages List -->
      <div class="messages-section">
        <h3>Conversation History ({{ messages.length }} messages)</h3>
        <p class="hint">Click any message to view detailed analysis</p>
        <div class="messages">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message clickable"
            :class="message.role"
            @click="showMessageAnalysis(message)"
          >
            <div class="message-header">
              <span class="role">{{ message.role }}</span>
              <span class="timestamp">{{ formatTimestamp(message.timestamp) }}</span>
            </div>
            <div class="message-content">
              {{ message.content }}
            </div>
            <div v-if="message.cotAnalysis" class="message-badges">
              <span class="badge cot-badge">CoT Analysis Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Analysis Modal -->
    <div v-if="selectedMessageAnalysis" class="analysis-modal" @click.self="closeAnalysis">
      <div class="analysis-panel">
        <div class="analysis-header">
          <h3>Event Analysis</h3>
          <button @click="closeAnalysis" class="close-button">×</button>
        </div>
        <div class="analysis-content">
          <!-- Event Basic Info -->
          <div class="section">
            <h4>Event Details</h4>
            <div class="event-info">
              <div class="info-row">
                <span class="label">Event ID:</span>
                <span class="value mono">{{ selectedMessageAnalysis.message.id }}</span>
              </div>
              <div class="info-row">
                <span class="label">Type:</span>
                <span class="value">{{ selectedMessageAnalysis.message.type }}</span>
              </div>
              <div class="info-row">
                <span class="label">Role:</span>
                <span class="value">{{ selectedMessageAnalysis.message.role }}</span>
              </div>
              <div class="info-row">
                <span class="label">Timestamp:</span>
                <span class="value">{{ new Date(selectedMessageAnalysis.message.timestamp).toLocaleString() }}</span>
              </div>
            </div>
            <div class="event-content">
              <strong>Content:</strong>
              <p>{{ selectedMessageAnalysis.message.content }}</p>
            </div>
          </div>

          <!-- Risk Snapshot (if triggered) -->
          <div v-if="selectedMessageAnalysis.triggeredSnapshot" class="section highlighted">
            <h4>⚠️ Risk Assessment Triggered</h4>
            <div class="risk-info">
              <div class="info-row">
                <span class="label">Risk Score:</span>
                <span class="risk-badge" :class="getRiskClass(selectedMessageAnalysis.triggeredSnapshot.riskScore)">
                  {{ selectedMessageAnalysis.triggeredSnapshot.riskScore.toFixed(2) }}
                </span>
              </div>
              <div v-if="selectedMessageAnalysis.triggeredSnapshot.patterns.length > 0" class="info-row">
                <span class="label">Patterns Detected:</span>
                <div class="patterns">
                  <span
                    v-for="pattern in selectedMessageAnalysis.triggeredSnapshot.patterns"
                    :key="pattern"
                    class="pattern-tag"
                  >
                    {{ pattern }}
                  </span>
                </div>
              </div>
              <div v-if="selectedMessageAnalysis.triggeredSnapshot.explanation" class="info-row">
                <span class="label">Explanation:</span>
                <p class="explanation">{{ selectedMessageAnalysis.triggeredSnapshot.explanation }}</p>
              </div>
            </div>
          </div>

          <!-- CoT Analysis (if available) -->
          <div v-if="selectedMessageAnalysis.cotAnalysis" class="section highlighted">
            <h4>🧠 Chain-of-Thought Analysis</h4>
            
            <div class="info-row">
              <span class="label">CoT Risk Score:</span>
              <span class="risk-badge" :class="getRiskClass(selectedMessageAnalysis.cotAnalysis.riskScore)">
                {{ selectedMessageAnalysis.cotAnalysis.riskScore.toFixed(2) }}
              </span>
            </div>

            <div v-if="selectedMessageAnalysis.cotAnalysis.labels.length > 0" class="subsection">
              <strong>Labels:</strong>
              <div class="labels">
                <span
                  v-for="label in selectedMessageAnalysis.cotAnalysis.labels"
                  :key="label"
                  class="label-tag"
                >
                  {{ label }}
                </span>
              </div>
            </div>

            <div v-if="selectedMessageAnalysis.cotAnalysis.indicators.length > 0" class="subsection">
              <strong>Indicators:</strong>
              <ul class="indicators">
                <li v-for="indicator in selectedMessageAnalysis.cotAnalysis.indicators" :key="indicator">
                  {{ indicator }}
                </li>
              </ul>
            </div>

            <div v-if="selectedMessageAnalysis.cotAnalysis.summary" class="subsection">
              <strong>Summary:</strong>
              <p>{{ selectedMessageAnalysis.cotAnalysis.summary }}</p>
            </div>
          </div>

          <!-- Metadata (if available) -->
          <div v-if="selectedMessageAnalysis.message.metadata" class="section">
            <h4>Additional Metadata</h4>
            <pre class="metadata-json">{{ JSON.stringify(selectedMessageAnalysis.message.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { 
  SessionDetail, 
  EventWithAnalysis, 
  CoTAnalysis,
  RiskSnapshot,
} from '@safetylayer/contracts';
import { EVENT_TYPES } from '@safetylayer/contracts';
import { api } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Message interface for display (converted from events)
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  cotAnalysis?: CoTAnalysis;
  metadata?: any;
  type: string;
}

// Extended analysis view for clicked messages
interface MessageAnalysisView {
  message: Message;
  triggeredSnapshot?: RiskSnapshot;
  cotAnalysis?: CoTAnalysis;
}

const router = useRouter();
const route = useRoute();
const projectId = inject<Ref<string>>('projectId')!;
const sessionId = route.params.id as string;

const sessionDetail = ref<SessionDetail | null>(null);
const messages = ref<Message[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedMessageAnalysis = ref<MessageAnalysisView | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const POLL_INTERVAL = 5000; // 5 seconds

const fetchSession = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Fetch session details and events in parallel
    const [sessionResponse, eventsResponse] = await Promise.all([
      api.getSession(sessionId),
      api.listEvents(sessionId, projectId.value, {
        limit: 1000,
      }),
    ]);

    sessionDetail.value = sessionResponse.session;
    
    // Convert events to messages for display
    messages.value = convertEventsToMessages(eventsResponse.events);
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch session';
    console.error('Error fetching session:', err);
  } finally {
    loading.value = false;
  }
};

/**
 * Convert API events to display messages
 * Matches CoT analyses with their corresponding assistant messages
 */
function convertEventsToMessages(events: EventWithAnalysis[]): Message[] {
  const messageEvents = events.filter(
    e => e.type === EVENT_TYPES.MESSAGE_USER || e.type === EVENT_TYPES.MESSAGE_ASSISTANT
  );

  const cotEvents = events.filter(e => e.type === EVENT_TYPES.COT);

  // Convert message events to Message interface
  const convertedMessages: Message[] = messageEvents.map(event => ({
    id: event.id,
    role: event.role!,
    content: event.content || '',
    timestamp: event.createdAt,
    metadata: event.metadata,
    type: event.type,
  }));

  // Attach CoT analysis to assistant messages
  // Match by timestamp proximity (CoT should be close to assistant message)
  cotEvents.forEach(cotEvent => {
    if (cotEvent.cotAnalysis) {
      // Find the closest assistant message by timestamp
      const assistantMessages = convertedMessages.filter(m => m.role === 'assistant');
      
      if (assistantMessages.length > 0) {
        // Find closest by timestamp
        let closestMessage = assistantMessages[0];
        let minDiff = Math.abs(cotEvent.createdAt - closestMessage.timestamp);

        for (const msg of assistantMessages) {
          const diff = Math.abs(cotEvent.createdAt - msg.timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestMessage = msg;
          }
        }

        // Attach if within 5 seconds
        if (minDiff < 5000) {
          closestMessage.cotAnalysis = cotEvent.cotAnalysis;
        }
      }
    }
  });

  return convertedMessages;
}

const startPolling = () => {
  fetchSession();
  pollInterval = setInterval(fetchSession, POLL_INTERVAL);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

const goBack = () => {
  router.push('/');
};

const showMessageAnalysis = (message: Message) => {
  // Find if this message triggered any risk snapshot
  const triggeredSnapshot = sessionDetail.value?.riskSnapshots.find(
    snapshot => snapshot.eventId === message.id
  );

  selectedMessageAnalysis.value = {
    message,
    triggeredSnapshot,
    cotAnalysis: message.cotAnalysis,
  };
};

const closeAnalysis = () => {
  selectedMessageAnalysis.value = null;
};

const getRiskClass = (riskScore: number): string => {
  if (riskScore >= 0.7) return 'high';
  if (riskScore >= 0.4) return 'medium';
  return 'low';
};

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};

const chartData = computed(() => {
  if (!sessionDetail.value || !sessionDetail.value.riskSnapshots || sessionDetail.value.riskSnapshots.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  // Use riskSnapshots directly (they have createdAt timestamps)
  const snapshots = sessionDetail.value.riskSnapshots;

  return {
    labels: snapshots.map((snapshot: RiskSnapshot) => formatTimestamp(snapshot.createdAt)),
    datasets: [
      {
        label: 'Risk Score',
        data: snapshots.map((snapshot: RiskSnapshot) => snapshot.riskScore),
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.15)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#00d4ff',
        pointBorderColor: '#00d4ff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#00d4ff',
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
        pointHoverBorderWidth: 3,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(10, 14, 39, 0.95)',
      borderColor: '#00d4ff',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      padding: 12,
      displayColors: false,
    },
  },
  scales: {
    y: {
      min: 0,
      max: 1,
      ticks: {
        stepSize: 0.2,
        color: '#94a3b8',
        font: {
          size: 12,
          weight: 600,
        },
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
        lineWidth: 1,
      },
      border: {
        color: 'rgba(0, 212, 255, 0.3)',
      },
      title: {
        display: true,
        text: 'Risk Score',
        color: '#00d4ff',
        font: {
          size: 13,
          weight: 700,
        },
      },
    },
    x: {
      ticks: {
        color: '#94a3b8',
        font: {
          size: 11,
          weight: 600,
        },
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.03)',
        lineWidth: 1,
      },
      border: {
        color: 'rgba(0, 212, 255, 0.3)',
      },
      title: {
        display: true,
        text: 'Timeline',
        color: '#00d4ff',
        font: {
          size: 13,
          weight: 700,
        },
      },
    },
  },
};

// Watch for project changes
watch(projectId, () => {
  // Refetch when project changes
  if (sessionDetail.value) {
    fetchSession();
  }
});

onMounted(() => {
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.session-detail {
  max-width: 1600px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--glass-shadow);
}

.back-button {
  padding: 0.75rem 1.5rem;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid var(--accent-cyan);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent-cyan);
  transition: all 0.3s;
  box-shadow: inset 0 0 10px rgba(0, 212, 255, 0.1);
}

.back-button:hover {
  background: rgba(0, 212, 255, 0.2);
  box-shadow: var(--glow-cyan), inset 0 0 20px rgba(0, 212, 255, 0.2);
  transform: scale(1.05);
}

.header h2 {
  margin: 0;
  flex: 1;
  font-size: 1.4rem;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.status {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.risk-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.1rem;
  border: 2px solid;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.risk-badge.low {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success-emerald);
  border-color: var(--success-emerald);
  box-shadow: var(--glow-emerald), inset 0 0 20px rgba(16, 185, 129, 0.2);
}

.risk-badge.medium {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning-amber);
  border-color: var(--warning-amber);
  box-shadow: var(--glow-amber), inset 0 0 20px rgba(245, 158, 11, 0.2);
}

.risk-badge.high {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger-red);
  border-color: var(--danger-red);
  box-shadow: var(--glow-red), inset 0 0 20px rgba(239, 68, 68, 0.2);
  animation: pulse-glow 2s ease-in-out infinite;
}

.loading,
.error {
  text-align: center;
  padding: 4rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  color: var(--text-secondary);
}

.error {
  border-color: var(--danger-red);
  box-shadow: var(--glow-red);
}

.error p {
  color: var(--danger-red);
}

.error button {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger-red);
  border: 1px solid var(--danger-red);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.error button:hover {
  background: var(--danger-red);
  color: white;
  box-shadow: var(--glow-red);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.chart-section,
.patterns-section,
.messages-section {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
  transition: all 0.3s;
}

.chart-section:hover,
.patterns-section:hover,
.messages-section:hover {
  border-color: rgba(0, 212, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.1), var(--glass-shadow);
}

.chart-section h3,
.patterns-section h3,
.messages-section h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.messages-section .hint {
  margin: -0.5rem 0 1.5rem 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-style: italic;
}

.chart-container {
  height: 350px;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.1);
}

.patterns {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pattern-tag {
  padding: 0.5rem 1rem;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid var(--accent-purple);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent-purple);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.2);
  transition: all 0.3s;
}

.pattern-tag:hover {
  background: rgba(168, 85, 247, 0.25);
  box-shadow: var(--glow-purple), inset 0 0 15px rgba(168, 85, 247, 0.3);
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.message {
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-left: 4px solid;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.message::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.message:hover::before {
  opacity: 1;
}

.message.clickable {
  cursor: pointer;
}

.message.clickable:hover {
  transform: translateX(8px) scale(1.01);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.message.user {
  border-left-color: var(--accent-cyan);
}

.message.user:hover {
  border-color: rgba(0, 212, 255, 0.5);
  box-shadow: var(--glow-cyan), 0 8px 24px rgba(0, 0, 0, 0.4);
}

.message.assistant {
  border-left-color: var(--accent-purple);
}

.message.assistant:hover {
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: var(--glow-purple), 0 8px 24px rgba(0, 0, 0, 0.4);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.role {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.message.user .role {
  color: var(--accent-cyan);
  background: rgba(0, 212, 255, 0.1);
}

.message.assistant .role {
  color: var(--accent-purple);
  background: rgba(168, 85, 247, 0.1);
}

.timestamp {
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-muted);
}

.message-content {
  color: var(--text-primary);
  line-height: 1.7;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.message-badges {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cot-badge {
  background: rgba(168, 85, 247, 0.15);
  color: var(--accent-purple);
  border: 1px solid var(--accent-purple);
  box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.2);
}

.cot-badge::before {
  content: '🧠';
  font-size: 0.9rem;
}

.analysis-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.analysis-panel {
  background: var(--bg-primary);
  border: 1px solid var(--accent-cyan);
  border-radius: 16px;
  max-width: 1000px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 60px rgba(0, 212, 255, 0.3), 0 20px 80px rgba(0, 0, 0, 0.9);
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  backdrop-filter: blur(10px);
  z-index: 10;
  box-shadow: 0 2px 20px rgba(0, 212, 255, 0.1);
}

.analysis-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.close-button {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger-red);
  border-radius: 50%;
  font-size: 1.5rem;
  color: var(--danger-red);
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  line-height: 1;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: var(--danger-red);
  color: white;
  transform: rotate(90deg) scale(1.1);
  box-shadow: var(--glow-red);
}

.analysis-content {
  padding: 2rem;
}

.section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--glass-shadow);
  transition: all 0.3s;
}

.section:hover {
  border-color: rgba(0, 212, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.1);
}

.section:last-child {
  margin-bottom: 0;
}

.section.highlighted {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
  border: 1px solid rgba(0, 212, 255, 0.3);
  box-shadow: 0 0 30px rgba(0, 212, 255, 0.1), var(--glass-shadow);
}

.section h4 {
  margin: 0 0 1.25rem 0;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subsection {
  margin-top: 1.25rem;
}

.subsection strong {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.event-info, .risk-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.info-row .label {
  font-weight: 700;
  color: var(--text-secondary);
  min-width: 140px;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-row .value {
  color: var(--text-primary);
  flex: 1;
  line-height: 1.6;
}

.info-row .value.mono {
  font-family: 'JetBrains Mono', monospace;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.2);
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--accent-cyan);
}

.event-content {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(0, 212, 255, 0.2);
}

.event-content strong {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  font-size: 0.85rem;
}

.event-content p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.7;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
}

.explanation {
  margin: 0.75rem 0 0 0 !important;
  padding: 1rem !important;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: var(--text-primary);
  line-height: 1.7;
}

.labels {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.label-tag {
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger-red);
  border: 1px solid var(--danger-red);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: inset 0 0 10px rgba(239, 68, 68, 0.2);
  transition: all 0.3s;
}

.label-tag:hover {
  background: rgba(239, 68, 68, 0.25);
  box-shadow: var(--glow-red), inset 0 0 15px rgba(239, 68, 68, 0.3);
}

.patterns {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.indicators {
  margin: 0.75rem 0 0 0;
  padding-left: 2rem;
}

.indicators li {
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  line-height: 1.7;
  position: relative;
}

.indicators li::marker {
  color: var(--accent-cyan);
}

.metadata-json {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 212, 255, 0.2);
  color: #e2e8f0;
  padding: 1.5rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

/* Scrollbar for modal */
.analysis-panel::-webkit-scrollbar {
  width: 8px;
}

.analysis-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.analysis-panel::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
  border-radius: 10px;
}

.analysis-panel::-webkit-scrollbar-thumb:hover {
  background: var(--accent-cyan);
  box-shadow: var(--glow-cyan);
}
</style>
