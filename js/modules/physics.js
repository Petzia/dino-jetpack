import { PLAYER, WORLD } from './config.js';
import { clamp, dampFactor, wrapAngle } from './math.js';
import { FLOATING_ROCKS, isOverRock, rockBottom, surfaceHeightAt } from './terrain.js';

const GROUND_SNAP = 0.6;

/** Default world used by the game; tests can pass a simpler one. */
export const DEFAULT_WORLD = Object.freeze({
  rocks: FLOATING_ROCKS,
  surfaceAt: (x, z, fromY) => surfaceHeightAt(x, z, fromY, FLOATING_ROCKS),
  playRadius: WORLD.playRadius,
  ceiling: WORLD.ceiling,
});

export function createPlayer(x = 0, z = 0, world = DEFAULT_WORLD) {
  return {
    x,
    y: world.surfaceAt(x, z, -Infinity),
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,
    fuel: 1,
    grounded: true,
    thrusting: false,
    emptyLatch: false,
  };
}

function updateHeading(player, input, dt) {
  // Facing +z at heading 0; with the camera behind, screen-right is -x, so turning right lowers the heading.
  player.heading = wrapAngle(player.heading - input.turn * PLAYER.turnRate * dt);
}

function updateHorizontalVelocity(player, input, dt) {
  const maxSpeed = player.grounded ? PLAYER.groundMaxSpeed : PLAYER.airMaxSpeed;
  const forward = input.forward < 0 ? input.forward * PLAYER.backwardFactor : input.forward;
  const targetX = Math.sin(player.heading) * forward * maxSpeed;
  const targetZ = Math.cos(player.heading) * forward * maxSpeed;
  const hasInput = input.forward !== 0;
  let rate;
  if (player.grounded) rate = PLAYER.groundResponse;
  else rate = hasInput ? PLAYER.airResponse : PLAYER.airDrift;
  const t = dampFactor(rate, dt);
  player.vx += (targetX - player.vx) * t;
  player.vz += (targetZ - player.vz) * t;
}

/**
 * Returns true when the tank just ran dry. After running dry, the jetpack stays off until
 * the thrust button is released or the tank is full again, so holding it on the ground refuels.
 */
function updateFuelAndThrust(player, input, dt) {
  if (!input.thrust || player.fuel >= 1) player.emptyLatch = false;
  const wantsThrust = input.thrust && player.fuel > 0 && !player.emptyLatch;
  const hadFuel = player.fuel > 0;
  player.thrusting = wantsThrust;
  if (wantsThrust) {
    player.fuel = Math.max(0, player.fuel - PLAYER.fuelDrainPerSecond * dt);
  } else if (player.grounded) {
    player.fuel = Math.min(1, player.fuel + PLAYER.fuelRefillPerSecond * dt);
  }
  const acceleration = (wantsThrust ? PLAYER.thrust : 0) - PLAYER.gravity;
  player.vy = clamp(player.vy + acceleration * dt, -PLAYER.maxFallSpeed, PLAYER.maxRiseSpeed);
  const emptied = hadFuel && player.fuel === 0;
  if (emptied) player.emptyLatch = true;
  return emptied;
}

function pushOutOfRock(player, rock) {
  const dx = player.x - rock.x;
  const dz = player.z - rock.z;
  const distance = Math.hypot(dx, dz);
  const nx = distance > 0 ? dx / distance : 1;
  const nz = distance > 0 ? dz / distance : 0;
  const limit = rock.radius + PLAYER.bodyRadius;
  player.x = rock.x + nx * limit;
  player.z = rock.z + nz * limit;
  const inward = player.vx * nx + player.vz * nz;
  if (inward < 0) {
    player.vx -= inward * nx;
    player.vz -= inward * nz;
  }
}

/** Keeps the player out of the body of floating rocks (sides and underside). */
function resolveRockCollisions(player, previousY, rocks) {
  for (const rock of rocks) {
    if (!isOverRock(rock, player.x, player.z, PLAYER.bodyRadius)) continue;
    const bottom = rockBottom(rock);
    const overlaps = player.y < rock.top && player.y + PLAYER.bodyHeight > bottom;
    const cameFromAbove = previousY >= rock.top - 0.05;
    if (!overlaps || cameFromAbove) continue;
    if (previousY + PLAYER.bodyHeight <= bottom + 0.5) {
      player.y = bottom - PLAYER.bodyHeight;
      player.vy = Math.min(player.vy, 0);
    } else {
      pushOutOfRock(player, rock);
    }
  }
}

function keepInsidePlayArea(player, world) {
  const distance = Math.hypot(player.x, player.z);
  if (distance > world.playRadius) {
    const nx = player.x / distance;
    const nz = player.z / distance;
    player.x = nx * world.playRadius;
    player.z = nz * world.playRadius;
    const outward = player.vx * nx + player.vz * nz;
    if (outward > 0) {
      player.vx -= outward * nx;
      player.vz -= outward * nz;
    }
  }
  if (player.y > world.ceiling) {
    player.y = world.ceiling;
    player.vy = Math.min(player.vy, 0);
  }
}

/**
 * Advances the player by dt seconds.
 * input: { turn: -1..1, forward: -1..1, thrust: boolean }
 * Returns flags describing what happened during the step.
 */
export function stepPlayer(player, input, dt, world = DEFAULT_WORLD) {
  const wasGrounded = player.grounded;
  const previousY = player.y;

  updateHeading(player, input, dt);
  updateHorizontalVelocity(player, input, dt);
  const fuelEmptied = updateFuelAndThrust(player, input, dt);

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.z += player.vz * dt;

  resolveRockCollisions(player, previousY, world.rocks);
  keepInsidePlayArea(player, world);

  const ground = world.surfaceAt(player.x, player.z, previousY);
  // Stick to the ground when walking down a slope instead of hopping off it.
  const snapToGround = wasGrounded && !player.thrusting && player.y - ground < GROUND_SNAP;
  if (player.y <= ground || snapToGround) {
    player.y = ground;
    player.vy = Math.max(0, player.vy);
    player.grounded = player.vy === 0;
  } else {
    player.grounded = false;
  }

  return {
    landed: !wasGrounded && player.grounded,
    tookOff: wasGrounded && !player.grounded,
    fuelEmptied,
  };
}
