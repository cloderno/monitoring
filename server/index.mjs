// Production-сервер: отдаёт собранный фронтенд из dist/ и обрабатывает /api/*.
// Запуск: npm run build && npm start
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiHandler } from './api.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

// Простейшая загрузка .env (без перезаписи уже заданных переменных окружения)
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('Сборка не найдена. Сначала выполните: npm run build');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const api = createApiHandler(process.env);

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = normalize(join(dist, urlPath));
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(dist, 'index.html'); // SPA-маршруты
  }
  const ext = extname(file);
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  if (file.includes(`${join(dist, 'assets')}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  createReadStream(file).pipe(res);
}

const port = Number(process.env.PORT) || 3000;
createServer((req, res) => api(req, res, () => serveStatic(req, res))).listen(port, () => {
  console.log(`Мониторинг цен — Контроль СЗПТ: http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) console.warn('GEMINI_API_KEY не задан — распознавание недоступно, работает ручной ввод.');
});
