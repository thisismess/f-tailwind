import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
    modules: ['../src/module'],
    vite: {
        plugins: [tailwindcss()],
    },
    css: ['~/assets/main.css'],
});
