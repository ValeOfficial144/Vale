<script setup lang="ts">
import { Maximize, RefreshCw } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getController } from '@/scram';

type Vm = {
  id: string;
  name: string;
  url: string;
  image: string;
  proxy: boolean;
  isolated?: boolean;
};

const VMS: Vm[] = [
  {
    id: 'xp',
    name: 'Windows XP',
    url: 'https://winxp.themultiverseeyt.workers.dev/',
    image: '/assets/images/winxp-tile.jpg',
    proxy: true,
  },
  {
    id: 'firefox',
    name: 'Firefox',
    url: 'https://developer.puter.com/labs/firefox-wasm/',
    image: '/assets/images/firefox-title.jpg',
    proxy: true,
    isolated: true,
  },
];

const route = useRoute();
const router = useRouter();

const query = ref('');
const frame = ref<HTMLIFrameElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const loading = ref(false);
const failed = ref('');

let handle: { go: (url: string) => void } | null = null;
let started = false;

const active = computed(() => {
  const fromPath = typeof route.params.vm === 'string' ? route.params.vm : '';
  const fromQuery = typeof route.query.vm === 'string' ? route.query.vm : '';
  const id = fromPath || fromQuery;
  return VMS.find((vm) => vm.id === id) ?? null;
});

const shown = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? VMS.filter((vm) => vm.name.toLowerCase().includes(q)) : VMS;
});

function open(vm: Vm) {
  router.push(vm.isolated ? { path: `/vms/${vm.id}` } : { path: '/vms', query: { vm: vm.id } });
}

function random() {
  const pool = shown.value.length ? shown.value : VMS;
  open(pool[Math.floor(Math.random() * pool.length)]);
}

async function start(vm: Vm) {
  const el = frame.value;
  if (!el) return;
  loading.value = true;
  failed.value = '';
  handle = null;
  started = false;
  if (!vm.proxy) {
    started = true;
    el.src = vm.url;
    return;
  }
  try {
    const controller = await getController();
    if (frame.value !== el) return;
    handle = controller.createFrame(el);
    started = true;
    handle.go(vm.url);
  } catch (err) {
    failed.value = err instanceof Error ? err.message : String(err);
    loading.value = false;
  }
}

function onFrameLoad() {
  if (started) loading.value = false;
}

function reload() {
  const vm = active.value;
  if (!vm) return;
  loading.value = true;
  failed.value = '';
  if (handle) handle.go(vm.url);
  else if (frame.value) frame.value.src = vm.url;
}

function fullscreen() {
  stage.value?.requestFullscreen?.().catch(() => {});
}

watch(
  active,
  async (vm) => {
    handle = null;
    started = false;
    loading.value = false;
    failed.value = '';
    if (!vm) return;
    await nextTick();
    start(vm);
  },
  { flush: 'post' },
);

onMounted(() => {
  if (active.value) start(active.value);
});

onBeforeUnmount(() => {
  handle = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
});
</script>

<template>
  <div v-if="!active" class="vmPage">
    <div class="vmHeader">
      <input
        v-model="query"
        class="vmSearch"
        type="text"
        placeholder="Search For A VM...."
        aria-label="Search For A VM"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" class="vmRandom" @click="random">Random Pick</button>
    </div>

    <div class="vmGrid">
      <button v-for="vm in shown" :key="vm.id" type="button" class="vmCard" @click="open(vm)">
        <img class="vmCardImage" :src="vm.image" :alt="vm.name" draggable="false" />
        <span class="vmCardShade"></span>
        <span class="vmCardTitle">{{ vm.name }}</span>
      </button>
    </div>

    <p v-if="!shown.length" class="vmEmpty">No VMs Available</p>
  </div>

  <div v-else class="vmShell">
    <div class="vmPlayer">
      <div class="vmMain">
        <div ref="stage" class="vmStage">
          <iframe
            ref="frame"
            class="vmFrame"
            :title="active.name"
            allow="fullscreen; autoplay; clipboard-read; clipboard-write; microphone; camera"
            @load="onFrameLoad"
          ></iframe>

          <div v-if="loading || failed" class="vmLoader">
            <p v-if="failed" class="vmFailed">{{ failed }}</p>
            <div v-else class="vmTrack"><span class="vmFill"></span></div>
          </div>
        </div>
      </div>

      <div class="vmBar">
        <img class="vmBarIcon" :src="active.image" :alt="active.name" draggable="false" />
        <span class="vmBarName">{{ active.name }}</span>
      </div>
    </div>

    <div class="vmSide">
      <button type="button" class="vmSideBtn" aria-label="Fullscreen" @click="fullscreen">
        <Maximize :size="20" />
      </button>
      <button type="button" class="vmSideBtn" aria-label="Reload" @click="reload">
        <RefreshCw :size="20" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.vmPage {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 20px clamp(12px, 3vw, 32px) 32px;
  animation: fadeIn 200ms ease-out both;
}

.vmHeader {
  display: flex;
  gap: 14px;
  max-width: 1400px;
  margin: 0 auto 14px;
}

.vmSearch {
  flex: 1;
  min-width: 0;
  height: 48px;
  box-sizing: border-box;
  padding: 0 18px;
  border: 1px solid var(--sg-border);
  border-radius: 14px;
  background: var(--sg-surface-raised);
  color: var(--sg-text);
  font: inherit;
  font-size: 16px;
  outline: none;
  box-shadow: 0 6px 16px var(--sg-shadow-soft);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.vmSearch::placeholder {
  color: var(--sg-text-muted);
}

.vmSearch:focus {
  border-color: var(--sg-accent);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--sg-accent) 28%, transparent),
    0 6px 16px var(--sg-shadow-soft);
}

.vmRandom {
  height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: 12px;
  background: var(--sg-accent);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}

.vmRandom:hover {
  filter: brightness(1.1);
}

.vmGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 172px);
  gap: 12px;
  max-width: 1400px;
  margin: 0 auto;
}

.vmCard {
  position: relative;
  width: 172px;
  height: 172px;
  padding: 0;
  overflow: hidden;
  border: 2px solid var(--sg-border);
  border-radius: 12px;
  background: var(--sg-surface);
  color: var(--sg-text);
  cursor: pointer;
}

.vmCard:focus-visible {
  border-color: var(--sg-accent);
  outline: none;
}

.vmCardImage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
}

.vmCardShade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgb(24 10 2 / 90%) 0%, rgb(24 10 2 / 0%) 60%);
}

.vmCardTitle {
  position: absolute;
  left: 12px;
  bottom: 10px;
  right: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.vmEmpty {
  margin: 24px 0 0;
  color: var(--sg-text-muted);
  text-align: center;
}

.vmShell {
  display: flex;
  flex: 1;
  align-items: stretch;
  gap: 12px;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  margin: clamp(12px, 5vw, 100px) clamp(12px, 5vw, 100px) clamp(12px, 3vw, 40px);
  animation: fadeIn 200ms ease-out both;
}

.vmPlayer {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  border: 2px solid var(--sg-border);
  border-radius: 12px;
  background: var(--sg-surface);
}

.vmMain {
  display: flex;
  flex: 1;
  min-height: 0;
}

.vmStage {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--sg-page-bg);
}

.vmSide {
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: center;
  flex-shrink: 0;
  gap: 6px;
  width: 52px;
  box-sizing: border-box;
  padding: 10px 0;
  border: 2px solid var(--sg-border);
  border-radius: 8px;
  background: var(--sg-surface);
}

.vmFrame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--sg-page-bg);
}

.vmLoader {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--sg-page-bg);
}

.vmTrack {
  width: min(450px, 70%);
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--sg-surface-raised);
}

.vmFill {
  display: block;
  width: 22%;
  height: 100%;
  border-radius: 999px;
  background: var(--sg-accent);
  animation: vmSlide 1.1s ease-in-out infinite alternate;
}

.vmFailed {
  max-width: 420px;
  margin: 0;
  padding: 0 16px;
  color: var(--sg-text-soft);
  text-align: center;
}

.vmBar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 58px;
  box-sizing: border-box;
  padding: 0 16px;
  border-top: 2px solid var(--sg-border);
  background: var(--sg-surface);
}

.vmBarIcon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 8px;
  user-select: none;
}

.vmBarName {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--sg-text);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vmSideBtn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sg-accent-soft);
  cursor: pointer;
  transition: 0.15s;
}

.vmSideBtn:hover {
  background: var(--sg-surface-hover);
  color: var(--sg-text-soft);
}

.vmSideBtn:focus-visible {
  outline: 2px solid var(--sg-accent);
  outline-offset: -2px;
}

@keyframes vmSlide {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(354%);
  }
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
  .vmPage,
  .vmShell {
    animation: none;
  }

  .vmFill {
    animation: none;
  }
}
</style>
