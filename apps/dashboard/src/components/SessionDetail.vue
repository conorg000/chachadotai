<template>
  <div class="session-detail">
    <div class="header">
      <button @click="goBack" class="back-button">← Back to Sessions</button>
      <h2>Session: {{ sessionId }}</h2>
      <div class="status">
        <span class="risk-badge" :class="getRiskClass(session?.riskScore || 0)">
          Risk: {{ (session?.riskScore || 0).toFixed(2) }}
        </span>
      </div>
    </div>

    <div v-if="loading && !session" class="loading">
      Loading session...
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchSession">Retry</button>
    </div>

    <div v-else-if="session" class="content">
      <!-- Risk Timeline Chart -->
      <div class="chart-section">
        <h3>Risk Timeline</h3>
        <div class="chart-container">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Patterns Summary -->
      <div v-if="session.patterns?.length > 0" class="patterns-section">
        <h3>Detected Patterns</h3>
        <div class="patterns">
          <span
            v-for="pattern in session.patterns"
            :key="pattern"
            class="pattern-tag"
          >
            {{ pattern }}
          </span>
        </div>
      </div>

      <!-- Messages List -->
      <div class="messages-section">
        <h3>Conversation History ({{ session.messages?.length }} messages)</h3>
        <div class="messages">
          <div
            v-for="message in session.messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <div class="message-header">
              <span class="role">{{ message.role }}</span>
              <span class="timestamp">{{ formatTimestamp(message.timestamp) }}</span>
            </div>
            <div class="message-content">
              {{ message.content }}
            </div>
            <button
              v-if="message.role === 'assistant' && message.cotRecord"
              @click="showCoT(message)"
              class="cot-button"
            >
              View CoT Analysis
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CoT Panel Modal -->
    <div v-if="selectedMessage" class="cot-modal" @click.self="closeCoT">
      <div class="cot-panel">
        <div class="cot-header">
          <h3>Chain-of-Thought Analysis</h3>
          <button @click="closeCoT" class="close-button">×</button>
        </div>
        <div class="cot-content">
          <div v-if="selectedMessage.cotRecord.analysis" class="analysis">
            <div class="section">
              <h4>Risk Score</h4>
              <span class="risk-badge" :class="getRiskClass(selectedMessage.cotRecord.analysis.riskScore)">
                {{ selectedMessage.cotRecord.analysis.riskScore.toFixed(2) }}
              </span>
            </div>

            <div v-if="selectedMessage.cotRecord.analysis.labels.length > 0" class="section">
              <h4>Labels</h4>
              <div class="labels">
                <span
                  v-for="label in selectedMessage.cotRecord.analysis.labels"
                  :key="label"
                  class="label-tag"
                >
                  {{ label }}
                </span>
              </div>
            </div>

            <div v-if="selectedMessage.cotRecord.analysis.summary" class="section">
              <h4>Summary</h4>
              <p>{{ selectedMessage.cotRecord.analysis.summary }}</p>
            </div>

            <div v-if="selectedMessage.cotRecord.analysis.rawCoT" class="section">
              <h4>Raw Chain-of-Thought</h4>
              <pre class="raw-cot">{{ selectedMessage.cotRecord.analysis.rawCoT }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
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

interface CoTAnalysis {
  riskScore: number;
  labels: string[];
  indicators: string[];
  summary: string;
}

interface CoTRecord {
  messageId: string;
  sessionId: string;
  rawCoT: string;
  userInput?: string; // Optional: the user's prompt for context
  finalOutput?: string; // Optional: the model's final answer
  analysis: CoTAnalysis | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  cotRecord?: CoTRecord;
}

interface RiskSnapshot {
  atMessageId: string;
  riskScore: number;
  patterns: string[];
}

interface Session {
  sessionId: string;
  riskScore: number;
  patterns: string[];
  messages: Message[];
  timeline: RiskSnapshot[];
}

const router = useRouter();
const route = useRoute();
const sessionId = route.params.id as string;

const session = ref<Session | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedMessage = ref<Message | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const POLL_INTERVAL = 5000; // 5 seconds

const fetchSession = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}`);

    session.value = response.data.session;
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || 'Failed to fetch session';
    console.error('Error fetching session:', err);
  } finally {
    loading.value = false;
  }
};

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

const showCoT = (message: Message) => {
  selectedMessage.value = message;
};

const closeCoT = () => {
  selectedMessage.value = null;
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
  if (!session.value || !session.value.timeline || session.value.timeline.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  // Convert timeline (RiskSnapshot[]) to chart data
  // Find corresponding message timestamps for each snapshot
  const timelineWithTimestamps = session.value.timeline.map((snapshot: RiskSnapshot) => {
    const message = session.value!.messages.find(m => m.id === snapshot.atMessageId);
    return {
      timestamp: message?.timestamp || Date.now(),
      riskScore: snapshot.riskScore,
    };
  });

  return {
    labels: timelineWithTimestamps.map((item: { timestamp: number; riskScore: number }) => formatTimestamp(item.timestamp)),
    datasets: [
      {
        label: 'Risk Score',
        data: timelineWithTimestamps.map((item: { timestamp: number; riskScore: number }) => item.riskScore),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4,
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
  },
  scales: {
    y: {
      min: 0,
      max: 1,
      ticks: {
        stepSize: 0.2,
      },
      title: {
        display: true,
        text: 'Risk Score',
      },
    },
    x: {
      title: {
        display: true,
        text: 'Time',
      },
    },
  },
};

onMounted(() => {
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.session-detail {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-button {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.back-button:hover {
  background: #e0e0e0;
}

.header h2 {
  margin: 0;
  flex: 1;
  font-size: 1.5rem;
  color: #333;
  font-family: monospace;
}

.status {
  display: flex;
  gap: 1rem;
}

.risk-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
}

.risk-badge.low {
  background: #e8f5e9;
  color: #4caf50;
}

.risk-badge.medium {
  background: #fff3e0;
  color: #ff9800;
}

.risk-badge.high {
  background: #ffebee;
  color: #f44336;
}

.loading,
.error {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.error {
  color: #e53935;
}

.error button {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.chart-section,
.patterns-section,
.messages-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-section h3,
.patterns-section h3,
.messages-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.chart-container {
  height: 300px;
}

.patterns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pattern-tag {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #555;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #ccc;
}

.message.user {
  background: #f5f5f5;
  border-left-color: #667eea;
}

.message.assistant {
  background: #fafafa;
  border-left-color: #764ba2;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.role {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
  color: #666;
}

.timestamp {
  font-size: 0.85rem;
  color: #999;
}

.message-content {
  color: #333;
  line-height: 1.6;
}

.cot-button {
  margin-top: 0.75rem;
  padding: 0.4rem 0.8rem;
  background: #764ba2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.cot-button:hover {
  background: #653a8f;
}

.cot-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.cot-panel {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.cot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background: white;
}

.cot-header h3 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  line-height: 1;
}

.close-button:hover {
  color: #333;
}

.cot-content {
  padding: 1.5rem;
}

.analysis .section {
  margin-bottom: 1.5rem;
}

.analysis .section:last-child {
  margin-bottom: 0;
}

.analysis h4 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.labels {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.label-tag {
  padding: 0.4rem 0.8rem;
  background: #ffebee;
  color: #f44336;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.raw-cot {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #333;
}
</style>
