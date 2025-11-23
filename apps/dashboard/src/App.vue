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
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
  padding: 1.25rem 2rem;
  z-index: 100;
}

/* Subtle accent line at bottom */
.header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--accent-purple) 30%,
    var(--accent-pink) 70%,
    transparent 100%
  );
  opacity: 0.5;
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
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-purple-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.01em;
}

.header .subtitle {
  margin: 0.375rem 0 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 400;
  letter-spacing: 0;
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
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 0.625rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.project-selector:hover {
  border-color: rgba(147, 51, 234, 0.3);
  background: var(--glass-bg-hover);
}

.project-selector label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.project-select {
  background: rgba(147, 51, 234, 0.08);
  color: var(--text-primary);
  border: 1px solid rgba(147, 51, 234, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-width: 180px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.project-select:hover {
  background: rgba(147, 51, 234, 0.12);
  border-color: var(--accent-purple);
}

.project-select:focus {
  outline: none;
  border-color: var(--accent-purple);
  box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.2);
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
