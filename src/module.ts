import { defineNuxtModule, addVitePlugin } from '@nuxt/kit';
import { fTailwindPlugin } from './vite-plugin';

export interface ModuleOptions {
    enabled?: boolean;
}

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'f-tailwind',
        configKey: 'fTailwind',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    defaults: {
        enabled: true,
    },

    setup(options: ModuleOptions) {
        if (!options.enabled) return;
        addVitePlugin(fTailwindPlugin());
    },
});
