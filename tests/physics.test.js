import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PLAYER } from '../js/modules/config.js';
import { createPlayer, stepPlayer } from '../js/modules/physics.js';

// Flat ground at y = 0 and one rock, so every outcome is easy to predict.
const ROCK = { x: 20, z: 0, top: 10, radius: 4, thickness: 3 };
const flatWorld = {
  rocks: [ROCK],
  surfaceAt: (x, z, fromY) => (fromY >= ROCK.top - 0.05 && Math.hypot(x - ROCK.x, z - ROCK.z) < ROCK.radius ? ROCK.top : 0),
  playRadius: 50,
  ceiling: 30,
};
const IDLE = { turn: 0, forward: 0, thrust: false };
const THRUST = { turn: 0, forward: 0, thrust: true };
const DT = 1 / 60;

function run(player, input, seconds) {
  const results = [];
  for (let t = 0; t < seconds; t += DT) results.push(stepPlayer(player, input, DT, flatWorld));
  return results;
}

describe('stepPlayer', () => {
  it('starts on the ground with a full tank', () => {
    const player = createPlayer(0, 0, flatWorld);
    assert.equal(player.y, 0);
    assert.equal(player.fuel, 1);
    assert.equal(player.grounded, true);
  });

  it('rises while thrusting and reports the take off', () => {
    const player = createPlayer(0, 0, flatWorld);
    const results = run(player, THRUST, 1);
    assert.ok(player.y > 2, `expected to rise, got y=${player.y}`);
    assert.equal(player.grounded, false);
    assert.equal(results.filter((r) => r.tookOff).length, 1);
  });

  it('drains fuel in about five seconds of thrust and then stops thrusting', () => {
    const player = createPlayer(0, 0, flatWorld);
    const results = run(player, THRUST, 1 / PLAYER.fuelDrainPerSecond + 0.2);
    assert.equal(player.fuel, 0);
    assert.equal(player.thrusting, false);
    assert.equal(results.filter((r) => r.fuelEmptied).length, 1);
  });

  it('does not refill fuel in the air, but refills on the ground', () => {
    const player = createPlayer(0, 0, flatWorld);
    run(player, THRUST, 1);
    const fuelInAir = player.fuel;
    stepPlayer(player, IDLE, DT, flatWorld);
    assert.ok(player.fuel <= fuelInAir);

    const results = run(player, IDLE, 4);
    assert.equal(player.grounded, true);
    assert.equal(player.fuel, 1);
    assert.equal(results.filter((r) => r.landed).length, 1);
  });

  it('moves forward along the heading and turns right with positive turn input', () => {
    const player = createPlayer(0, 0, flatWorld);
    run(player, { turn: 0, forward: 1, thrust: false }, 1);
    assert.ok(player.z > 3, 'heading 0 faces +z');
    assert.ok(Math.abs(player.x) < 1e-9);

    const turner = createPlayer(0, 0, flatWorld);
    run(turner, { turn: 1, forward: 0, thrust: false }, 0.5);
    assert.ok(turner.heading < 0, 'turning right lowers the heading');
  });

  it('never leaves the play area', () => {
    const player = createPlayer(45, 0, flatWorld);
    player.heading = Math.PI / 2; // facing +x, towards the edge
    run(player, { turn: 0, forward: 1, thrust: false }, 3);
    assert.ok(Math.hypot(player.x, player.z) <= flatWorld.playRadius + 1e-9);
  });

  it('stops at the ceiling', () => {
    const player = createPlayer(0, 0, flatWorld);
    player.fuel = 1;
    run(player, THRUST, 4.9);
    assert.ok(player.y <= flatWorld.ceiling);
  });

  it('lands on top of a floating rock when falling onto it', () => {
    const player = createPlayer(ROCK.x, 0, flatWorld);
    player.y = ROCK.top + 3;
    player.grounded = false;
    run(player, IDLE, 2);
    assert.equal(player.y, ROCK.top);
    assert.equal(player.grounded, true);
  });

  it('bumps its head under a floating rock instead of passing through', () => {
    const player = createPlayer(ROCK.x, 0, flatWorld);
    run(player, THRUST, 3);
    assert.ok(player.y + PLAYER.bodyHeight <= ROCK.top - ROCK.thickness + 1e-9);
  });

  it('is pushed out when flying into the side of a rock', () => {
    const player = createPlayer(ROCK.x - 10, 0, flatWorld);
    player.y = ROCK.top - 1.5;
    player.grounded = false;
    player.heading = Math.PI / 2;
    for (let t = 0; t < 1.5; t += DT) {
      player.vy = 0; // hover at the rock's height
      stepPlayer(player, { turn: 0, forward: 1, thrust: false }, DT, flatWorld);
    }
    assert.ok(Math.hypot(player.x - ROCK.x, player.z - ROCK.z) >= ROCK.radius + PLAYER.bodyRadius - 1e-9);
  });

  it('refuels while thrust is held with an empty tank, without hopping', () => {
    const player = createPlayer(0, 0, flatWorld);
    const results = [];
    let refilledWhileHeld = false;
    for (let t = 0; t < 20; t += DT) {
      results.push(stepPlayer(player, THRUST, DT, flatWorld));
      if (player.fuel === 1 && results.some((r) => r.fuelEmptied)) refilledWhileHeld = true;
    }
    assert.ok(refilledWhileHeld, 'the tank refills fully while thrust is held');
    // Each cycle is a full flight then a full refuel: a handful of landings, not dozens of hops.
    assert.ok(results.filter((r) => r.landed).length <= 3);
    assert.ok(results.filter((r) => r.fuelEmptied).length <= 3);
  });

  it('can thrust again after releasing the button', () => {
    const player = createPlayer(0, 0, flatWorld);
    run(player, THRUST, 1 / PLAYER.fuelDrainPerSecond + 0.2);
    run(player, IDLE, 4); // fall and partly refuel
    run(player, THRUST, 0.3);
    assert.equal(player.thrusting, true);
  });

  it('falls when walking off the edge of a floating rock', () => {
    const player = createPlayer(ROCK.x, 0, flatWorld);
    player.y = ROCK.top + 0.5;
    player.grounded = false;
    run(player, IDLE, 1); // settle on top
    assert.equal(player.y, ROCK.top);
    player.heading = Math.PI / 2;
    run(player, { turn: 0, forward: 1, thrust: false }, 3);
    assert.ok(player.y < ROCK.top - 1, `expected to fall, got y=${player.y}`);
  });

  it('keeps the heading wrapped', () => {
    const player = createPlayer(0, 0, flatWorld);
    run(player, { turn: 1, forward: 0, thrust: false }, 10);
    assert.ok(player.heading >= -Math.PI && player.heading < Math.PI);
  });
});
