import type { Session, User } from '../types/auth';
import { apiRequest } from './apiClient';

const STORAGE_KEY = 'szpt.session';

export async function login(loginName: string, password: string): Promise<Session> {
  const data = await apiRequest<{ token: string; user: User }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginName, password }),
  });
  const session: Session = { ...data, startedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* хранилище недоступно — сессия живёт до перезагрузки */
  }
  return session;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Проверяет, что токен ещё действителен на сервере */
export async function fetchMe(token: string): Promise<User> {
  const data = await apiRequest<{ user: User }>('/api/me', { token });
  return data.user;
}

export async function fetchHealth(): Promise<{ geminiConfigured: boolean; model: string }> {
  return apiRequest('/api/health');
}
