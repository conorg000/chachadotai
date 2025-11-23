<template>
  <div id="app">
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <h1>SafetyLayer Dashboard</h1>
          <p class="subtitle">AI Safety Monitoring System</p>
        </div>
        <div class="header-right">
          <div class="project-selector">
            <label for="project-select">Project:</label>
            <select
              id="project-select"
              v-model="selectedProjectId"
              class="project-select"
            >
              <option
                v-for="project in projects"
                :key="project.id"
                :value="project.id"
              >
                {{ project.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { provide, ref, watch } from "vue";
import { RouterView } from "vue-router";
import { config } from "./config";

// Project list (hardcoded for now, will be dynamic later)
interface Project {
  id: string;
  name: string;
}

const projects = ref<Project[]>([
  { id: "dev-project", name: "Dev Project" },
  { id: "proj_demo", name: "Demo Project" },
]);

// Selected project ID (defaults to config value)
const selectedProjectId = ref<string>(config.defaultProjectId);

// Provide selectedProjectId to all child components
provide("projectId", selectedProjectId);

// Log when project changes (for debugging)
watch(selectedProjectId, (newProjectId) => {
  console.log("Project switched to:", newProjectId);
});
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  padding: 1.5rem 2rem;
  z-index: 100;
}

/* Neon accent line at bottom */
.header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    90deg,
    var(--accent-cyan) 0%,
    var(--accent-purple) 100%
  );
  box-shadow: 0 0 20px var(--accent-cyan), 0 0 40px var(--accent-purple);
  animation: pulse-glow 3s ease-in-out infinite;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-left {
  flex: 1;
}

.header h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(
    135deg,
    var(--accent-cyan) 0%,
    var(--accent-purple) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  text-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
  filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.5));
}

.header .subtitle {
  margin: 0.5rem 0 0 0;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.8;
}

.header-right {
  display: flex;
  align-items: center;
}

.project-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.project-selector:hover {
  border-color: var(--accent-cyan);
  box-shadow: var(--glow-cyan), var(--glass-shadow);
  background: rgba(255, 255, 255, 0.08);
}

.project-selector label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.project-select {
  background: rgba(0, 212, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid var(--accent-cyan);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 180px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 0 10px rgba(0, 212, 255, 0.2);
}

.project-select:hover {
  background: rgba(0, 212, 255, 0.15);
  border-color: var(--accent-cyan);
  box-shadow: var(--glow-cyan), inset 0 0 20px rgba(0, 212, 255, 0.3);
  transform: scale(1.02);
}

.project-select:focus {
  outline: none;
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.3), var(--glow-cyan);
}

.project-select option {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0.5rem;
}

.main {
  flex: 1;
  padding: 2rem;
  position: relative;
}
</style>
