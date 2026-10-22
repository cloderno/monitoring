// Точка входа API на Vercel: все запросы /api/* обрабатывает тот же код, что и локально.
import { createApiHandler } from '../server/api.mjs';

const handler = createApiHandler(process.env);

export default function vercelApi(req, res) {
  return handler(req, res);
}
