import { defineConfig, UserConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
function electronRenderer () {
    const builtins = builtinModules.filter((m) => !m.startsWith('_'));
    const cacheDir = path.join(process.cwd(), '.vite-electron-renderer');

    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true, });
    }

    return {
        name: 'vite-plugin-electron-renderer-custom',
        enforce: 'pre',
        config (config: UserConfig) {
            const optimizeDeps = config.optimizeDeps = config.optimizeDeps || {};
            const exclude = optimizeDeps.exclude = optimizeDeps.exclude || [];
            const excludes = ['electron', ...builtins, ...builtins.map((m) => `node:${m}`),];

            exclude.push(...excludes.filter((e) => !exclude.includes(e)));
        },
        resolveId (source: string) {
            if (source === 'electron' || builtins.includes(source.replace(/^node:/, ''))) {
                const name = source.replace(/^node:/, '').replace(/\//g, '_');
                const shimPath = path.join(cacheDir, name + '.mjs');

                if (!fs.existsSync(shimPath)) {
                    const isElectron = source === 'electron';
                    const requireId = isElectron ? 'electron' : source;
                    const exports = isElectron ?
                        [
                            'clipboard', 'contextBridge', 'crashReporter', 'ipcRenderer',
                            'nativeImage', 'shell', 'webFrame', 'deprecate',
                        ] :
                        Object.getOwnPropertyNames(createRequire(import.meta.url)(requireId))
                            .filter((m) => m !== 'default' && !m.startsWith('_'));

                    const content = `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const _M_ = require("${requireId}");
export default _M_;
${exports.map((m) => `export const ${m} = _M_.${m};`).join('\n')}
`.trim();

                    fs.writeFileSync(shimPath, content);
                }
                return shimPath;
            }
        },
    };
}

function suppressDeprecations () {
    return {
        name: 'suppress-deprecations',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        configResolved (config: any) {
            const output = config.build?.rollupOptions?.output;

            if (!output) { return; }
            const outputs = Array.isArray(output) ? output : [output,];

            for (const o of outputs) {
                if (o) {
                    // Remove deprecated options injected by other plugins
                    delete o.inlineDynamicImports;
                    delete o.freeze;
                }
            }
        },
    };
}

export default defineConfig({
    plugins: [
        react(),
        suppressDeprecations(),
        process.env.VITE_WEB === 'true' ? null : electron({
            main: {
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        // @ts-expect-error - codeSplitting is required for Vite 8/9
                        // to replace deprecated inlineDynamicImports
                        codeSplitting: false,
                        rollupOptions: {
                            external: [],
                        },
                    },
                    plugins: [suppressDeprecations(),],
                },
            },
            preload: {
                // Shortcut of `build.rollupOptions.input`.
                // Preload scripts may contain Web assets, so use the `build.rollupOptions.input`
                // instead of `build.lib.entry`.
                input: path.join(__dirname, 'electron/preload.ts'),
                vite: {
                    build: {
                        // @ts-expect-error - codeSplitting is required for Vite 8/9
                        // to replace deprecated inlineDynamicImports
                        codeSplitting: false,
                    },
                    plugins: [suppressDeprecations(),],
                },
            },
        }),
        process.env.NODE_ENV === 'test' || process.env.VITE_WEB === 'true' ? null : electronRenderer(),
        suppressDeprecations(),
    ],
    envPrefix: ['VITE_', 'STOCKS',],
});
