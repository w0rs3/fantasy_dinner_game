import { DEFAULT_PREFERENCES, STATE_VERSION, STORAGE_KEYS } from '../config.js';

function cloneStoredValue(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export class MemoryStorage {
  #values = new Map();

  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
  clear() { this.#values.clear(); }
}

export class SessionRepository {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  listSessions() {
    const sessions = safeParse(this.storage.getItem(STORAGE_KEYS.sessions), []);
    return sessions
      .filter((session) => session?.version === STATE_VERSION && session?.id)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(cloneStoredValue);
  }

  getSession(sessionId) {
    return this.listSessions().find((session) => session.id === sessionId) ?? null;
  }

  getCurrentSession() {
    const currentId = this.storage.getItem(STORAGE_KEYS.currentSession);
    return currentId ? this.getSession(currentId) : null;
  }

  saveSession(session) {
    const snapshot = cloneStoredValue({ ...session, version: STATE_VERSION, updatedAt: Date.now() });
    const sessions = this.listSessions();
    const index = sessions.findIndex((candidate) => candidate.id === snapshot.id);
    if (index >= 0) sessions[index] = snapshot;
    else sessions.push(snapshot);
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    this.storage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    this.storage.setItem(STORAGE_KEYS.currentSession, snapshot.id);
    return cloneStoredValue(snapshot);
  }

  setCurrent(sessionId) {
    if (sessionId) this.storage.setItem(STORAGE_KEYS.currentSession, sessionId);
    else this.storage.removeItem(STORAGE_KEYS.currentSession);
  }

  deleteSession(sessionId) {
    const remaining = this.listSessions().filter((session) => session.id !== sessionId);
    this.storage.setItem(STORAGE_KEYS.sessions, JSON.stringify(remaining));
    if (this.storage.getItem(STORAGE_KEYS.currentSession) === sessionId) {
      this.storage.removeItem(STORAGE_KEYS.currentSession);
    }
    return remaining.length;
  }

  clearSessions() {
    this.storage.removeItem(STORAGE_KEYS.sessions);
    this.storage.removeItem(STORAGE_KEYS.currentSession);
  }

  getPreferences() {
    return {
      ...DEFAULT_PREFERENCES,
      ...safeParse(this.storage.getItem(STORAGE_KEYS.preferences), {})
    };
  }

  savePreferences(preferences) {
    const next = { ...this.getPreferences(), ...preferences };
    this.storage.setItem(STORAGE_KEYS.preferences, JSON.stringify(next));
    return next;
  }

  exportSession(sessionId) {
    const session = this.getSession(sessionId);
    return session ? JSON.stringify(session, null, 2) : null;
  }
}
