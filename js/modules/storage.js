import { MAX_STORED_SCORE, STORAGE_KEYS } from './config.js';

/** Returns a safe integer best score from an untrusted stored value. */
export function parseBestScore(raw) {
  if (typeof raw !== 'string' || !/^\d{1,7}$/.test(raw)) return 0;
  return Math.min(Number.parseInt(raw, 10), MAX_STORED_SCORE);
}

export function parseMuted(raw) {
  return raw === 'true';
}

function safeGet(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null; // storage can be blocked (private mode, disabled cookies)
  }
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Not being able to save is not worth interrupting the game.
  }
}

export function loadBestScore(storage) {
  return parseBestScore(safeGet(storage, STORAGE_KEYS.bestScore));
}

/** Saves the score if it beats the stored one. Returns true for a new record. */
export function saveBestScore(storage, score) {
  if (!Number.isInteger(score) || score <= 0) return false;
  const value = Math.min(score, MAX_STORED_SCORE);
  if (value <= loadBestScore(storage)) return false;
  safeSet(storage, STORAGE_KEYS.bestScore, String(value));
  return true;
}

export function loadMuted(storage) {
  return parseMuted(safeGet(storage, STORAGE_KEYS.muted));
}

export function saveMuted(storage, muted) {
  safeSet(storage, STORAGE_KEYS.muted, String(Boolean(muted)));
}
