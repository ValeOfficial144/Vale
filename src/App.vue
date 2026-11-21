<script setup lang="ts">
import ParticleBackground from '@/components/ParticleBackground.vue';
import Sidebar from '@/components/Sidebar.vue';
import { RouterView } from 'vue-router';
</script>

<template>
  <ParticleBackground class="bg"/>
  <div class="app-shell">
    <Sidebar />
    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>
<style scoped>
:global(:root) {
  --sg-page-bg: #170d07;
  --sg-surface: #22140b;
  --sg-surface-raised: #2b1a0e;
  --sg-surface-hover: #5a3416;
  --sg-border: #5a3416;
  --sg-accent: #e8630a;
  --sg-accent-soft: #ff9a4d;
  --sg-accent-light: #ffc08a;
  --sg-text: #ffffff;
  --sg-text-soft: #ffd9b8;
  --sg-text-muted: #d9955c;
  --sg-shadow-soft: rgb(24 10 2 / 24%);
  --sg-shadow-strong: rgb(24 10 2 / 48%);
}

:global(body) {
  margin: 0;
  font-family: 'Inter', sans-serif;
  color: var(--sg-text);
}

.bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-color: var(--sg-page-bg);
}

.app-shell {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

@media (min-width: 768px) {
  .app-shell {
    flex-direction: row;
  }
}
</style>
