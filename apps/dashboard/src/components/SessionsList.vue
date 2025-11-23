<template>
  <div class="sessions-list">
    <div class="header">
      <h2>Sessions</h2>
      <div class="status">
        <span class="indicator" :class="{ active: isPolling }"></span>
        <span>{{ isPolling ? "Live" : "Disconnected" }}</span>
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
      <p class="hint">
        Start a conversation in the demo API to see sessions appear here
      </p>
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
            <td class="session-id">
              {{ session.id.substring(0, 2) }}...{{ session.id.slice(-2) }}
            </td>
            <td class="risk-cell">
              <div
                class="risk-badge"
                :class="getRiskClass(session.currentRiskScore)"
              >
                <span class="risk-value">{{
                  session.currentRiskScore.toFixed(2)
                }}</span>
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
                <span
                  v-if="session.currentPatterns.length === 0"
                  class="no-patterns"
                >
                  None
                </span>
              </div>
            </td>
            <td class="events-cell">{{ session.eventCount }}</td>
            <td class="timestamp-cell">
              {{ formatTimestamp(session.lastActivityAt) }}
            </td>
            <td class="actions-cell">
              <button @click.stop="viewSession(session.id)" class="view-button">
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
import type { SessionSummary } from "@safetylayer/contracts";
import { inject, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../services/api";

const router = useRouter();
const projectId = inject<Ref<string>>("projectId")!;

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
      sortBy: "lastActivityAt",
      sortOrder: "desc",
      limit: 50,
    });

    sessions.value = response.sessions;
    isPolling.value = true;
  } catch (err: any) {
    error.value = err.message || "Failed to fetch sessions";
    isPolling.value = false;
    console.error("Error fetching sessions:", err);
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
  if (riskScore >= 0.7) return "high";
  if (riskScore >= 0.4) return "medium";
  return "low";
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
};

const formatSessionId = (sessionId: string): string => {
  if (sessionId.length <= 4) return sessionId;
  const first = sessionId.substring(0, 2);
  const last = sessionId.substring(sessionId.length - 2);
  return `${first}...${last}`;
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
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
}

.header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
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
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--glass-shadow);
}

/* Table */
.sessions-table {
  width: 100%;
  border-collapse: collapse;
}

.sessions-table thead {
  background: rgba(147, 51, 234, 0.05);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(147, 51, 234, 0.2);
}

.sessions-table th {
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(147, 51, 234, 0.2);
  white-space: nowrap;
}

.sessions-table th:nth-child(4) {
  text-align: center;
}

.sessions-table th:last-child {
  text-align: right;
}

.sessions-table td:last-child {
  text-align: right;
}

.sessions-table tbody {
  background: transparent;
}

/* Session Row */
.session-row {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.session-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.session-row.risk-low:hover {
  box-shadow: inset 3px 0 0 var(--success-emerald);
}

.session-row.risk-medium:hover {
  box-shadow: inset 3px 0 0 var(--warning-amber);
}

.session-row.risk-high:hover {
  box-shadow: inset 3px 0 0 var(--danger-red);
}

.sessions-table td {
  padding: 1.25rem 1.5rem;
  color: var(--text-primary);
  vertical-align: middle;
}

.session-id {
  font-family: "SF Mono", "Monaco", monospace;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--accent-purple);
  width: 120px;
  white-space: nowrap;
}

/* Cell Specific Styles */
.risk-cell {
  width: 100px;
  white-space: nowrap;
}

.risk-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.875rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  min-width: 65px;
  border: 1px solid;
  backdrop-filter: blur(12px);
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
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
}

.session-row:hover .risk-badge.medium {
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
}

.session-row:hover .risk-badge.high {
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
}

.patterns-cell {
  min-width: 250px;
}

.events-cell {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-primary);
  width: 80px;
  text-align: center;
  white-space: nowrap;
}

.timestamp-cell {
  font-family: "SF Mono", "Monaco", monospace;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  width: 120px;
  white-space: nowrap;
}

.actions-cell {
  width: 150px;
  white-space: nowrap;
}

/* Patterns */
.patterns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.pattern-tag {
  padding: 0.25rem 0.625rem;
  background: rgba(147, 51, 234, 0.12);
  border: 1px solid rgba(147, 51, 234, 0.3);
  border-radius: 8px;
  font-size: 0.6875rem;
  color: var(--accent-purple-light);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  transition: all 0.3s;
  white-space: nowrap;
}

.session-row:hover .pattern-tag {
  background: rgba(147, 51, 234, 0.18);
  border-color: var(--accent-purple);
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
  padding: 0.5rem 1rem;
  background: rgba(147, 51, 234, 0.1);
  color: var(--accent-purple-light);
  border: 1px solid rgba(147, 51, 234, 0.3);
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.view-button:hover {
  background: rgba(147, 51, 234, 0.15);
  border-color: var(--accent-purple);
  transform: scale(1.02);
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
