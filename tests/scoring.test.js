import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COMBO } from '../js/modules/config.js';
import { createScore, multiplierFor, registerEgg, registerLanding } from '../js/modules/scoring.js';

describe('scoring', () => {
  it('builds a multiplier for eggs chained in the air', () => {
    const score = createScore();
    const gains = [1, 2, 3].map(() => registerEgg(score, 1, true).gained);
    assert.deepEqual(gains, [1, 2, 3]);
    assert.equal(score.points, 6);
    assert.equal(score.chain, 3);
  });

  it('caps the multiplier', () => {
    assert.equal(multiplierFor(0), 1);
    assert.equal(multiplierFor(100), COMBO.maxMultiplier);
  });

  it('gives base points on the ground without building the combo', () => {
    const score = createScore();
    const result = registerEgg(score, 5, false);
    assert.deepEqual(result, { gained: 5, multiplier: 1 });
    assert.equal(score.chain, 0);
  });

  it('resets the chain on landing but keeps the best chain', () => {
    const score = createScore();
    registerEgg(score, 1, true);
    registerEgg(score, 1, true);
    assert.equal(registerLanding(score), 2);
    assert.equal(score.chain, 0);
    assert.equal(score.bestChain, 2);
    assert.equal(registerEgg(score, 1, true).multiplier, 1);
  });

  it('multiplies golden eggs too', () => {
    const score = createScore();
    registerEgg(score, 1, true);
    assert.equal(registerEgg(score, 5, true).gained, 10);
  });
});
