import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, type ProxyOptions, type UserConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { immichApiProxyPattern, viteApiDevPlugin } from '../../config/src/vite-api-dev-plugin.ts';
import { customViteAliases, resolveImmichServerUrl } from '../../config/src/vite.integration.ts';

const viteDir = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';

const createProxy = (mode: string): Record<string, string | ProxyOptions> => {
  Object.assign(process.env, loadEnv(mode, viteDir, ''));
  const upstream: ProxyOptions = {
    target: resolveImmichServerUrl(),
    secure: true,
    changeOrigin: true,
    logLevel: 'info',
    ws: true,
  };

  return {
    [immichApiProxyPattern]: upstream,
    '/.well-known/immich': upstream,
    '/custom.css': upstream,
  };
};

export default defineConfig(({ mode }) => ({
  build: {
    target: 'es2022',
  },
  resolve: {
    alias: {
      ...customViteAliases(),
      'xmlhttprequest-ssl': './node_modules/engine.io-client/lib/xmlhttprequest.js',
      // eslint-disable-next-line unicorn/prefer-module
      '@test-data': path.resolve(viteDir, './src/test-data'),
      // '@immich/ui': path.resolve(__dirname, '../../ui/packages/ui'),
    },
  },
  server: {
    // connect to a remote backend during web-only development
    proxy: createProxy(mode),
    allowedHosts: true,
    ...(isWindows
      ? {
          watch: {
            usePolling: true,
            interval: 500,
          },
        }
      : {}),
  },
  preview: {
    proxy: createProxy(mode),
  },
  plugins: [
    viteApiDevPlugin(),
    enhancedImages(),
    tailwindcss(),
    sveltekit(),
    process.env.BUILD_STATS === 'true'
      ? visualizer({
          emitFile: true,
          filename: 'stats.html',
        })
      : undefined,
    svelteTesting(),
  ],
  optimizeDeps: {
    entries: ['src/**/*.{svelte,ts,html}'],
  },
  test: {
    name: 'web:unit',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-data/setup.ts'],
    sequence: {
      hooks: 'list',
    },
    env: {
      TZ: 'UTC',
    },
  },
} as UserConfig));
