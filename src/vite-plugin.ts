import type { Plugin } from 'vite';
import { forwardTransform, clearExportsCache, getImportDependents, createTransformState } from './transform/forward';

export function fTailwindPlugin(): Plugin {
    // Each plugin instance gets its own caches so SSR client/server builds
    // running in the same Node process don't share stale state.
    const state = createTransformState();

    return {
        name: 'f-tailwind',
        enforce: 'pre',

        transform(code: string, id: string) {
            // Strip query strings (Nuxt Layers, Vite internal IDs: Component.vue?type=style)
            const cleanId = id.replace(/\?.*$/, '');
            if (!cleanId.endsWith('.vue')) return null;
            if (!code.includes('lang="f-tailwind"') && !code.includes("lang='f-tailwind'")) return null;

            try {
                return forwardTransform(code, cleanId, state);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[f-tailwind] Transform failed for ${id}: ${msg}`);
                // Strip the f-tailwind style blocks so Vue doesn't choke on lang="f-tailwind"
                const stripped = code.replace(/<style[^>]*lang=["']f-tailwind["'][^>]*>[\s\S]*?<\/style>/g, '');
                return stripped !== code ? { code: stripped, map: null } : null;
            }
        },

        handleHotUpdate({ file, server, modules }) {
            const cleanFile = file.replace(/\?.*$/, '');
            if (!cleanFile.endsWith('.vue')) return;

            clearExportsCache(cleanFile, state);

            // If other files import from this file, invalidate them so they re-transform
            const dependents = getImportDependents(cleanFile, state);
            if (dependents.length === 0) return;

            const extraModules = new Set(modules);
            for (const dep of dependents) {
                const mods = server.moduleGraph.getModulesByFile(dep);
                if (mods) {
                    for (const mod of mods) {
                        server.moduleGraph.invalidateModule(mod);
                        extraModules.add(mod);
                    }
                }
            }

            return [...extraModules];
        },
    };
}
