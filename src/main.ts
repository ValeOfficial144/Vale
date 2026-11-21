import { createApp } from 'vue';
import Particles from '@tsparticles/vue3';
import { loadSlim } from '@tsparticles/slim';
import { loadRibbonShape } from '@tsparticles/shape-ribbon';
import App from './App.vue';
import router from './router';
import { warmUp } from './scram';
import { initSettings } from './settings';

const app = createApp(App);

app.use(Particles, {
  init: async (engine) => {
    await loadSlim(engine);
    await loadRibbonShape(engine);
  },
});

app.use(router);

app.mount('#app');

warmUp();
initSettings();
