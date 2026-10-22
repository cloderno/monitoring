import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error — серверный модуль на чистом JS
import { createApiHandler } from './server/api.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        // В режиме разработки API работает внутри dev-сервера Vite,
        // ключ Gemini при этом остаётся на стороне Node и не попадает в бандл.
        name: 'szpt-api',
        configureServer(server) {
          server.middlewares.use(createApiHandler({ ...process.env, ...env }));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createApiHandler({ ...process.env, ...env }));
        },
      },
    ],
    server: { host: true, port: 5173 },
  };
});
