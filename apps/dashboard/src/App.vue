<template>
  <div id="app">
    <header class="header">
      <h1>SafetyLayer Dashboard</h1>
      <p class="subtitle">AI Safety Monitoring System</p>
    </header>
    
    <main class="main">
      <div class="placeholder">
        <h2>Dashboard Coming Soon</h2>
        <p>Session visualization and CoT analysis will be implemented in Ticket 6</p>
        <div class="features">
          <div class="feature">
            <h3>Session Monitoring</h3>
            <p>Track behavioral risk across conversations</p>
          </div>
          <div class="feature">
            <h3>Risk Timeline</h3>
            <p>Visualize risk escalation over time</p>
          </div>
          <div class="feature">
            <h3>CoT Analysis</h3>
            <p>Inspect chain-of-thought reasoning</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// Dashboard implementation will be added in Ticket 6
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 2.5rem;
}

.subtitle {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
}

.main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.placeholder {
  text-align: center;
  padding: 3rem 1rem;
}

.placeholder h2 {
  color: #667eea;
  margin-bottom: 1rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.feature {
  padding: 2rem;
  background: #f7f7f7;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.feature h3 {
  color: #333;
  margin-top: 0;
}

.feature p {
  color: #666;
  margin-bottom: 0;
}
</style>

