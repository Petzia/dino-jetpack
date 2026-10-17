import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CAMERA } from '../js/modules/config.js';
import { lerpAngle, wrapAngle } from '../js/modules/math.js';
import { chaseCameraTarget, formatTime, nearestEgg, screenAngleTo } from '../js/modules/navigation.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

describe('formatTime', () => {
  it('formats minutes and seconds, rounding up', () => {
    assert.equal(formatTime(120), '2:00');
    assert.equal(formatTime(65.2), '1:06');
    assert.equal(formatTime(9), '0:09');
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(-3), '0:00');
  });
});

describe('angles', () => {
  it('wraps angles to [-PI, PI)', () => {
    close(wrapAngle(3 * Math.PI / 2), -Math.PI / 2);
    close(wrapAngle(-3 * Math.PI / 2), Math.PI / 2);
    close(wrapAngle(0.5), 0.5);
  });

  it('interpolates through the shortest arc', () => {
    close(lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5), Math.PI);
  });
});

describe('screenAngleTo', () => {
  const origin = { x: 0, z: 0 };
  it('is 0 straight ahead', () => close(screenAngleTo(0, origin, { x: 0, z: 10 }), 0));
  it('is positive (clockwise) for a target on the right, which is -x when facing +z', () => {
    close(screenAngleTo(0, origin, { x: -10, z: 0 }), Math.PI / 2);
  });
  it('is negative for a target on the left', () => close(screenAngleTo(0, origin, { x: 10, z: 0 }), -Math.PI / 2));
});

describe('nearestEgg', () => {
  it('returns the closest egg or null', () => {
    assert.equal(nearestEgg([], { x: 0, z: 0 }), null);
    const eggs = [{ id: 1, x: 10, z: 0 }, { id: 2, x: 3, z: 3 }];
    assert.equal(nearestEgg(eggs, { x: 0, z: 0 }).id, 2);
  });
});

describe('chaseCameraTarget', () => {
  it('sits behind and above the target', () => {
    const { position, lookAt } = chaseCameraTarget({ x: 0, y: 5, z: 0 }, 0, () => 0);
    close(position.z, -CAMERA.distance);
    close(position.y, 5 + CAMERA.height);
    assert.ok(lookAt.z > 0);
  });

  it('never goes below the ground', () => {
    const { position } = chaseCameraTarget({ x: 0, y: 0, z: 0 }, 0, () => 50);
    assert.ok(position.y >= 50 + CAMERA.minClearance);
  });

  it('stays out of floating rocks', () => {
    const rock = { x: 0, z: -CAMERA.distance, top: 10, radius: 4, thickness: 3 };
    const above = chaseCameraTarget({ x: 0, y: 9, z: 0 }, 0, () => 0, [rock]);
    assert.ok(above.position.y >= rock.top);
    const below = chaseCameraTarget({ x: 0, y: 2, z: 0 }, 0, () => 0, [rock]);
    assert.ok(below.position.y <= rock.top - rock.thickness);
  });
});
