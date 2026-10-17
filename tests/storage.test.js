import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_STORED_SCORE, STORAGE_KEYS } from '../js/modules/config.js';
import { loadBestScore, loadMuted, parseBestScore, saveBestScore, saveMuted } from '../js/modules/storage.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  };
}

const brokenStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};

describe('parseBestScore', () => {
  it('accepts plain positive integers', () => {
    assert.equal(parseBestScore('42'), 42);
    assert.equal(parseBestScore('0'), 0);
  });

  it('rejects anything else', () => {
    for (const raw of [null, undefined, '', '-5', '3.5', '1e3', 'abc', '<img>', ' 7', '12345678', 42]) {
      assert.equal(parseBestScore(raw), 0, `input ${String(raw)}`);
    }
  });

  it('caps the value', () => {
    assert.equal(parseBestScore('9999999'), MAX_STORED_SCORE);
  });
});

describe('best score storage', () => {
  it('saves only real improvements', () => {
    const storage = memoryStorage({ [STORAGE_KEYS.bestScore]: '10' });
    assert.equal(saveBestScore(storage, 5), false);
    assert.equal(saveBestScore(storage, 10), false);
    assert.equal(saveBestScore(storage, 11), true);
    assert.equal(loadBestScore(storage), 11);
  });

  it('ignores invalid scores', () => {
    const storage = memoryStorage();
    for (const score of [0, -1, 2.5, NaN, '20']) assert.equal(saveBestScore(storage, score), false);
    assert.equal(storage.data.size, 0);
  });

  it('survives blocked or missing storage', () => {
    assert.equal(loadBestScore(brokenStorage), 0);
    assert.equal(loadBestScore(null), 0);
    assert.doesNotThrow(() => saveBestScore(brokenStorage, 3));
    assert.doesNotThrow(() => saveMuted(brokenStorage, true));
  });

  it('stores the muted preference', () => {
    const storage = memoryStorage();
    assert.equal(loadMuted(storage), false);
    saveMuted(storage, true);
    assert.equal(loadMuted(storage), true);
    storage.setItem(STORAGE_KEYS.muted, 'yes');
    assert.equal(loadMuted(storage), false);
  });
});
