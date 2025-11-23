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

    <div v-else class="sessions-table-container">
      <table class="sessions-table">
      <thead>
        <tr>
          <th>Session ID</th>
            <th>Risk</th>
          <th>Patterns</th>
            <th>Events</th>
          <th>Last Activity</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="session in sessions"
            :key="session.id"
            @click="viewSession(session.id)"
          class="session-row"
            :class="'risk-' + getRiskClass(session.currentRiskScore)"
        >
            <td class="session-id">{{ session.id }}</td>
            <td class="risk-cell">
              <div class="risk-badge" :class="getRiskClass(session.currentRiskScore)">
                <span class="risk-value">{{ session.currentRiskScore.toFixed(2) }}</span>
              </div>
          </td>
            <td class="patterns-cell">
            <div class="patterns">
              <span
                  v-for="pattern in session.currentPatterns"
                :key="pattern"
                class="pattern-tag"
              >
                {{ pattern }}
              </span>
                <span v-if="session.currentPatterns.length === 0" class="no-patterns">
                None
              </span>
            </div>
          </td>
            <td class="events-cell">{{ session.eventCount }}</td>
            <td class="timestamp-cell">{{ formatTimestamp(session.lastActivityAt) }}</td>
            <td class="actions-cell">
            <button
                @click.stop="viewSession(session.id)"
              class="view-button"
            >
                Analyze →
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import type { SessionSummary } from '@safetylayer/contracts';
import { api } from '../services/api';

const router = useRouter();
const projectId = inject<Ref<string>>('projectId')!;

const sessions = ref<SessionSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const isPolling = ref(false);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const POLL_INTERVAL = 3000; // 3 seconds

const fetchSessions = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await api.listSessions(projectId.value, {
      sortBy: 'lastActivityAt',
      sortOrder: 'desc',
      limit: 50,
    });
    
    sessions.value = response.sessions;
    isPolling.value = true;
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch sessions';
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

// Watch for project changes and refetch sessions
watch(projectId, () => {
  sessions.value = []; // Clear sessions when project changes
  if (isPolling.value) {
    fetchSessions();
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
.sessions-list {
  max-width: 1600px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--glass-shadow);
}

.header h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.02em;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-muted);
  box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.2);
}

.indicator.active {
  background: var(--success-emerald);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3), var(--glow-emerald);
  animation: pulse-glow 2s ease-in-out infinite;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 4rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--glass-shadow);
  color: var(--text-secondary);
}

.loading {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(0, 212, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
}

.error {
  border-color: var(--danger-red);
  box-shadow: var(--glow-red), var(--glass-shadow);
}

.error p {
  color: var(--danger-red);
  font-weight: 600;
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
  transform: scale(1.05);
}

.empty .hint {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
  font-style: italic;
}

/* Table Container */
.sessions-table-container {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--glass-shadow);
}

/* Table */
.sessions-table {
  width: 100%;
  border-collapse: collapse;
}

.sessions-table thead {
  background: rgba(0, 212, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 2px solid var(--accent-cyan);
}

.sessions-table th {
  padding: 1.25rem 1.5rem;
  text-align: left;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent-cyan);
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
}

.sessions-table tbody {
  background: transparent;
}

/* Session Row */
.session-row {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.session-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  opacity: 0;
  transition: all 0.3s;
}

.session-row.risk-low::before {
  background: var(--success-emerald);
  box-shadow: var(--glow-emerald);
}

.session-row.risk-medium::before {
  background: var(--warning-amber);
  box-shadow: var(--glow-amber);
}

.session-row.risk-high::before {
  background: var(--danger-red);
  box-shadow: var(--glow-red);
}

.session-row:hover::before {
  opacity: 1;
}

.session-row:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateX(4px);
}

.session-row.risk-low:hover {
  box-shadow: inset 4px 0 0 var(--success-emerald), 0 0 20px rgba(16, 185, 129, 0.1);
}

.session-row.risk-medium:hover {
  box-shadow: inset 4px 0 0 var(--warning-amber), 0 0 20px rgba(245, 158, 11, 0.1);
}

.session-row.risk-high:hover {
  box-shadow: inset 4px 0 0 var(--danger-red), 0 0 20px rgba(239, 68, 68, 0.1);
  animation: pulse-glow 2s ease-in-out infinite;
}

.sessions-table td {
  padding: 1.25rem 1.5rem;
  color: var(--text-primary);
  vertical-align: middle;
}

.session-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent-cyan);
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

/* Cell Specific Styles */
.risk-cell {
  width: 100px;
}

.risk-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.1rem;
  min-width: 70px;
  border: 2px solid;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.risk-badge .risk-value {
  line-height: 1;
}

.risk-badge.low {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success-emerald);
  border-color: var(--success-emerald);
  box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.2);
}

.risk-badge.medium {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning-amber);
  border-color: var(--warning-amber);
  box-shadow: inset 0 0 10px rgba(245, 158, 11, 0.2);
}

.risk-badge.high {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger-red);
  border-color: var(--danger-red);
  box-shadow: inset 0 0 10px rgba(239, 68, 68, 0.2);
}

.session-row:hover .risk-badge.low {
  box-shadow: var(--glow-emerald), inset 0 0 15px rgba(16, 185, 129, 0.3);
}

.session-row:hover .risk-badge.medium {
  box-shadow: var(--glow-amber), inset 0 0 15px rgba(245, 158, 11, 0.3);
}

.session-row:hover .risk-badge.high {
  box-shadow: var(--glow-red), inset 0 0 15px rgba(239, 68, 68, 0.3);
}

.patterns-cell {
  max-width: 300px;
}

.events-cell {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.timestamp-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.actions-cell {
  width: 150px;
}

/* Patterns */
.patterns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.pattern-tag {
  padding: 0.35rem 0.7rem;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid var(--accent-purple);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--accent-purple);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.2);
  transition: all 0.3s;
  white-space: nowrap;
}

.session-row:hover .pattern-tag {
  background: rgba(168, 85, 247, 0.25);
  box-shadow: var(--glow-purple), inset 0 0 15px rgba(168, 85, 247, 0.3);
}

.no-patterns {
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.85rem;
}

/* View Button */
.view-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
  color: var(--accent-cyan);
  border: 1px solid var(--accent-cyan);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 0 10px rgba(0, 212, 255, 0.1);
  white-space: nowrap;
}

.view-button:hover {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%);
  border-color: var(--accent-cyan);
  box-shadow: var(--glow-cyan), inset 0 0 20px rgba(0, 212, 255, 0.2);
  transform: scale(1.05);
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .sessions-table th,
  .sessions-table td {
    padding: 1rem;
  }
  
  .pattern-tag {
    font-size: 0.7rem;
    padding: 0.3rem 0.6rem;
  }
}

@media (max-width: 768px) {
  .sessions-table-container {
    overflow-x: auto;
  }
  
  .sessions-table {
    min-width: 800px;
  }
}
</style>
