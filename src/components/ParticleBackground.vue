<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isHome = computed(() => route.name === 'home');

const options = computed(() => {
    const colors = isHome.value ? ['#ff5a00', '#5c2008'] : ['#a58fe3', '#6f53b5'];
    return {
        background: { color: { opacity: 0 } },
        fullScreen: { enable: true, zIndex: 0 },
        detectRetina: false,
        fpsLimit: 60,
        particles: {
            number: {
                value: 45,
                density: { enable: false }
            },
            paint: colors.map((value) => ({
                fill: { enable: true, color: { value } }
            })),
            shape: {
                type: 'ribbon',
                options: {
                    ribbon: {
                        points: 12,
                        waveAmplitude: 0.35,
                        waveFrequency: 1.8,
                        thickness: 0.45
                    }
                }
            },
            opacity: {
                value: { min: 0.5, max: 1 }
            },
            size: {
                value: { min: 25, max: 70 }
            },
            roll: { enable: false },
            tilt: { enable: false },
            wobble: { enable: false },
            rotate: { value: 0, animation: { enable: false } },
            move: {
                enable: true,
                speed: { min: 0.3, max: 0.8 },
                outModes: 'out'
            }
        },
        interactivity: {
            events: {
                onClick: { enable: false },
                onHover: { enable: false }
            }
        }
    };
});
</script>

<template>
    <vue-particles :key="isHome ? 'home' : 'rest'" id="tsparticles" :options="options" />
</template>
