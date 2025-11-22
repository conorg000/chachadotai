<template>
  <div class="sessions-list">
    <div class="header">
      <h2>Active Sessions</h2>
      <div class="status">
        <span class="indicator" :class="{ active: isPolling }"></span>
        <span>{{ isPolling ? 'Live' : 'Disconnected' }}</span>
      </div>
    </div>

    <div v-if="loading && sessions.length === 0" class="loading">
      Loading sessions...
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchSessions">Retry</button>
    </div>

    <div v-else-if="sessions.length === 0" class="empty">
      <p>No sessions found</p>
      <p class="hint">Start a conversation in the demo API to see sessions appear here</p>
    </div>

    <table v-else class="sessions-table">
      <thead>
        <tr>
          <th>Session ID</th>
          <th>Risk Score</th>
          <th>Patterns</th>
          <th>Messages</th>
          <th>Last Activity</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="session in sessions"
          :key="session.sessionId"
          @click="viewSession(session.sessionId)"
          class="session-row"
        >
          <td class="session-id">{{ session.sessionId }}</td>
          <td>
            <span class="risk-badge" :class="getRiskClass(session.riskScore)">
              {{ session.riskScore.toFixed(2) }}
            </span>
          </td>
          <td>
            <div class="patterns">
              <span
                v-for="pattern in session.patterns"
                :key="pattern"
                class="pattern-tag"
              >
                {{ pattern }}
              </span>
              <span v-if="session.patterns.length === 0" class="no-patterns">
                None
              </span>
            </div>
          </td>
          <td>{{ session.messageCount }}</td>
          <td class="timestamp">{{ formatTimestamp(session.lastMessageTimestamp) }}</td>
          <td>
            <button
              @click.stop="viewSession(session.sessionId)"
              class="view-button"
            >
              View
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

interface Session {
  sessionId: string;
  riskScore: number;
  patterns: string[];
  messageCount: number;
  lastMessageTimestamp: number;
}

const router = useRouter();
const sessions = ref<Session[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const isPolling = ref(false);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const POLL_INTERVAL = 3000; // 3 seconds

const fetchSessions = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await axios.get(`${API_BASE_URL}/sessions`);
    sessions.value = response.data.sessions || [];
    isPolling.value = true;
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || 'Failed to fetch sessions';
    isPolling.value = false;
    console.error('Error fetching sessions:', err);
  } finally {
    loading.value = false;
  }
};

const startPolling = () => {
  fetchSessions(); // Initial fetch
  pollInterval = setInterval(fetchSessions, POLL_INTERVAL);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    isPolling.value = false;
  }
};

const viewSession = (sessionId: string) => {
  router.push(`/sessions/${sessionId}`);
};

const getRiskClass = (riskScore: number): string => {
  if (riskScore >= 0.7) return 'high';
  if (riskScore >= 0.4) return 'medium';
  return 'low';
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
};

onMounted(() => {
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.sessions-list {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h2 {
  margin: 0;
  font-size: 1.8rem;
  color: #333;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ccc;
}

.indicator.active {
  background: #4caf50;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading,
.error,
.empty {
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

.error button:hover {
  background: #5568d3;
}

.empty .hint {
  font-size: 0.9rem;
  color: #999;
  margin-top: 0.5rem;
}

.sessions-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.sessions-table thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.sessions-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
}

.sessions-table tbody tr {
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
}

.session-row {
  cursor: pointer;
}

.session-row:hover {
  background: #f5f5f5;
}

.sessions-table td {
  padding: 1rem;
}

.session-id {
  font-family: monospace;
  color: #667eea;
  font-weight: 500;
}

.risk-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
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

.patterns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pattern-tag {
  padding: 0.25rem 0.5rem;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #555;
}

.no-patterns {
  color: #999;
  font-style: italic;
  font-size: 0.9rem;
}

.timestamp {
  color: #999;
  font-size: 0.9rem;
}

.view-button {
  padding: 0.4rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.view-button:hover {
  background: #5568d3;
}
</style>
