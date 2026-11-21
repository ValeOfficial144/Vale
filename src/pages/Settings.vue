<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import {
  CLOAKS,
  cancelCapture,
  capturePanicKey,
  getCloak,
  getPanicKey,
  getPanicUrl,
  savePanicUrl,
  setCloak,
} from '../settings';

const cloak = ref(getCloak());
const panicKey = ref(getPanicKey());
const panicUrl = ref(getPanicUrl());
const urlInput = ref(getPanicUrl());
const listening = ref(false);
const blankMessage = ref('');
const urlMessage = ref('');

function keyLabel(key: string) {
  if (!key) return 'Not Set Yet';
  return key === ' ' ? 'Space' : key;
}

function openAboutBlank() {
  const w = window.open('about:blank', '_blank');
  if (!w) {
    blankMessage.value = 'PopUps Blocked.';
    return;
  }
  blankMessage.value = '';
  const doc = w.document;
  doc.title = 'New Tab';
  const style = doc.createElement('style');
  style.textContent = 'html,body{margin:0;padding:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}';
  doc.head.appendChild(style);
  const frame = doc.createElement('iframe');
  frame.src = window.location.origin;
  doc.body.appendChild(frame);
}

function onCloak() {
  setCloak(cloak.value);
}

function resetCloak() {
  cloak.value = '';
  setCloak('');
}

async function changeKey() {
  listening.value = true;
  const key = await capturePanicKey();
  panicKey.value = key;
  listening.value = false;
}

function saveUrl() {
  const saved = savePanicUrl(urlInput.value);
  if (!saved) {
    urlMessage.value = 'Enter A Valid Address Bum.';
    return;
  }
  panicUrl.value = saved;
  urlInput.value = saved;
  urlMessage.value = 'Saved.';
}

onBeforeUnmount(() => {
  cancelCapture();
});
</script>

<template>
  <div class="settingsPage">
    <div class="settingsColumn">
      <h1 class="settingsTitle">Settings</h1>

      <section class="card">
        <div class="cardHead">
          <div>
            <h2>Open In about:blank</h2>
            <p>Hide Your History With About.blank</p>
          </div>
          <button type="button" class="btn" @click="openAboutBlank">Open</button>
        </div>
        <p v-if="blankMessage" class="note">{{ blankMessage }}</p>
      </section>

      <section class="card">
        <div>
          <h2>Tab Cloak</h2>
          <p>Disguise The Tab Title And Icon</p>
        </div>
        <select v-model="cloak" class="field" aria-label="Tab cloak" @change="onCloak">
          <option value="">None (default)</option>
          <option v-for="(c, id) in CLOAKS" :key="id" :value="id">{{ c.label }}</option>
        </select>
        <button type="button" class="btn" @click="resetCloak">Reset Cloak</button>
      </section>

      <section class="card">
        <div>
          <h2>Panic Key</h2>
          <p>Press A Key To Instantly Redirect</p>
        </div>
        <div class="row">
          Current key: <span>{{ keyLabel(panicKey) }}</span>
        </div>
        <button type="button" class="btn" @click="changeKey">
          {{ listening ? 'Press any key...' : 'Change Panic Key' }}
        </button>
        <div class="row">
          Redirect URL: <span>{{ panicUrl || 'Not set' }}</span>
        </div>
        <input
          v-model="urlInput"
          class="field"
          type="text"
          placeholder="https://www.google.com"
          aria-label="Panic redirect URL"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter="saveUrl"
        />
        <button type="button" class="btn" @click="saveUrl">Set URL</button>
        <p v-if="urlMessage" class="note">{{ urlMessage }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settingsPage {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  box-sizing: border-box;
  display: flex;
  padding: 24px clamp(12px, 3vw, 32px) 40px;
  animation: fadeIn 200ms ease-out both;
}

.settingsColumn {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(100%, 560px);
  margin: auto;
}

.settingsTitle {
  margin: 0 0 4px;
  color: var(--sg-text);
  font-size: 1.6rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 2px solid var(--sg-border);
  border-radius: 12px;
  background: var(--sg-surface);
}

.cardHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card h2 {
  margin: 0;
  color: var(--sg-text);
  font-size: 1rem;
  font-weight: 600;
}

.card p {
  margin: 4px 0 0;
  color: var(--sg-text-muted);
  font-size: 0.85rem;
}

.row {
  color: var(--sg-text-soft);
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.row span {
  color: var(--sg-text);
}

.btn {
  flex-shrink: 0;
  align-self: flex-start;
  height: 40px;
  padding: 0 16px;
  border: 2px solid var(--sg-border);
  border-radius: 10px;
  background: var(--sg-surface-raised);
  color: var(--sg-text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.field {
  width: 100%;
  height: 42px;
  box-sizing: border-box;
  padding: 0 14px;
  border: 1px solid var(--sg-border);
  border-radius: 12px;
  background: var(--sg-surface-raised);
  color: var(--sg-text);
  color-scheme: dark;
  font: inherit;
  font-size: 0.95rem;
  outline: none;
}

.field::placeholder {
  color: var(--sg-text-muted);
}

.field:focus {
  border-color: var(--sg-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sg-accent) 28%, transparent);
}

select.field {
  cursor: pointer;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settingsPage {
    animation: none;
  }
}
</style>
