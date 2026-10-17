import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { combineInput, joystickVector } from '../js/modules/input.js';

describe('joystickVector', () => {
  it('ignores small movements in the dead zone', () => {
    assert.deepEqual(joystickVector(2, 2, 50, 0.15), { x: 0, y: 0 });
    assert.deepEqual(joystickVector(0, 0), { x: 0, y: 0 });
  });

  it('clamps to a unit vector at the edge', () => {
    const vector = joystickVector(500, 0, 50, 0.15);
    assert.equal(vector.x, 1);
    assert.equal(vector.y, 0);
  });
});

describe('combineInput', () => {
  it('maps keys to controls', () => {
    const input = combineInput(new Set(['forward', 'right', 'thrust']), { x: 0, y: 0 }, false);
    assert.deepEqual(input, { turn: 1, forward: 1, thrust: true });
  });

  it('maps stick up to forward and clamps combined values', () => {
    const input = combineInput(new Set(['forward']), { x: -0.5, y: -1 }, true);
    assert.deepEqual(input, { turn: -0.5, forward: 1, thrust: true });
  });

  it('cancels opposite keys', () => {
    const input = combineInput(new Set(['left', 'right']), { x: 0, y: 0 }, false);
    assert.equal(input.turn, 0);
    assert.equal(input.thrust, false);
  });
});
