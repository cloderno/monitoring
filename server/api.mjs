// Минимальный API: вход, профиль, распознавание фото через Gemini.
// Используется и dev-сервером Vite (vite.config.ts), и production-сервером (server/index.mjs).
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEMO_NAMES, USERS } from './users.mjs';
import { GeminiError, recognizeImage } from './gemini.mjs';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 14 * 1024 * 1024; // base64 ≈ +33% к 10 МБ изображения
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const productsPath = fileURLToPath(new URL('../public/products.json', import.meta.url));
const loadProducts = () => JSON.parse(readFileSync(productsPath, 'utf8')).products;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('too_large'), { code: 'too_large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('bad_json'), { code: 'bad_request' }));
      }
    });
    req.on('error', reject);
  });
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

export function createApiHandler(env = process.env) {
  const secret = env.AUTH_SECRET || randomBytes(32).toString('hex');
  const geminiKey = env.GEMINI_API_KEY || '';
  const geminiModel = env.GEMINI_MODEL || 'gemini-3.8-flash';
  const thinkingLevel = env.GEMINI_THINKING_LEVEL ?? 'low';
  const fallbackModels = (env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.5-flash,gemini-3.7-flash')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const loginAttempts = new Map(); // ip → { count, until }

  const sign = (payload) => {
    const body = b64url(JSON.stringify(payload));
    return `${body}.${b64url(createHmac('sha256', secret).update(body).digest())}`;
  };

  const verify = (token) => {
    if (typeof token !== 'string') return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', secret).update(body).digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      return payload.exp > Date.now() ? payload : null;
    } catch {
      return null;
    }
  };

  const authUser = (req) => verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));

  const publicUser = (p) => ({ login: p.sub, fullName: p.name, role: p.role, demo: p.demo });

  async function handleLogin(req, res) {
    const ip = req.socket?.remoteAddress || 'unknown';
    const state = loginAttempts.get(ip);
    if (state && state.count >= 10 && state.until > Date.now()) {
      return sendJson(res, 429, { error: 'too_many_attempts' });
    }
    const { login, password } = await readJsonBody(req);
    if (typeof login !== 'string' || typeof password !== 'string' || !login.trim() || !password) {
      return sendJson(res, 400, { error: 'empty_credentials' });
    }
    const user = USERS.find((u) => u.login === login.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      const next = state && state.until > Date.now() ? state.count + 1 : 1;
      loginAttempts.set(ip, { count: next, until: Date.now() + 5 * 60 * 1000 });
      return sendJson(res, 401, { error: 'invalid_credentials' });
    }
    loginAttempts.delete(ip);
    const payload = {
      sub: user.login,
      name: DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)],
      role: user.role,
      demo: true,
      exp: Date.now() + TOKEN_TTL_MS,
    };
    return sendJson(res, 200, { token: sign(payload), user: publicUser(payload) });
  }

  async function handleRecognize(req, res) {
    const user = authUser(req);
    if (!user) return sendJson(res, 401, { error: 'unauthorized' });
    if (!geminiKey) return sendJson(res, 503, { error: 'not_configured' });

    const { image, mimeType, lang } = await readJsonBody(req);
    if (typeof image !== 'string' || !image) return sendJson(res, 400, { error: 'no_image' });
    if (!ALLOWED_MIME.includes(mimeType)) return sendJson(res, 415, { error: 'unsupported_format' });

    try {
      const result = await recognizeImage({
        apiKey: geminiKey,
        model: geminiModel,
        fallbackModels,
        mimeType,
        base64: image,
        products: loadProducts(),
        thinkingLevel: thinkingLevel || undefined,
        lang: lang === 'kk' ? 'kk' : 'ru',
      });
      return sendJson(res, 200, { result });
    } catch (err) {
      if (err instanceof GeminiError) {
        console.error(`[gemini] ${err.code}: ${String(err.detail ?? '').slice(0, 500)}`);
        return sendJson(res, err.status, { error: err.code });
      }
      throw err;
    }
  }

  return async function apiHandler(req, res, next) {
    const url = (req.url || '').split('?')[0];
    if (!url.startsWith('/api/')) return next ? next() : sendJson(res, 404, { error: 'not_found' });

    try {
      if (req.method === 'POST' && url === '/api/login') return await handleLogin(req, res);
      if (req.method === 'GET' && url === '/api/me') {
        const user = authUser(req);
        return user ? sendJson(res, 200, { user: publicUser(user) }) : sendJson(res, 401, { error: 'unauthorized' });
      }
      if (req.method === 'GET' && url === '/api/health') {
        return sendJson(res, 200, { ok: true, geminiConfigured: Boolean(geminiKey), model: geminiModel });
      }
      if (req.method === 'POST' && url === '/api/recognize') return await handleRecognize(req, res);
      return sendJson(res, 404, { error: 'not_found' });
    } catch (err) {
      if (err?.code === 'too_large') return sendJson(res, 413, { error: 'too_large' });
      if (err?.code === 'bad_request') return sendJson(res, 400, { error: 'bad_request' });
      console.error('[api]', err);
      return sendJson(res, 500, { error: 'server_error' });
    }
  };
}
