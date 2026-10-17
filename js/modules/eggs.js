import { EGGS, WORLD } from './config.js';
import { randomRange } from './random.js';
import { FLOATING_ROCKS, terrainHeightAt } from './terrain.js';

export const EGG_KINDS = Object.freeze({ normal: 'normal', golden: 'golden' });

const EGG_HOVER = 0.9; // eggs sit slightly above the surface
const SPAWN_ATTEMPTS = 24;

function isNearAnyTree(x, z, trees) {
  return trees.some((tree) => Math.hypot(x - tree.x, z - tree.z) < 1.8 * tree.scale);
}

/**
 * Builds the list of places eggs can appear.
 * Normal eggs sit on the ground or float low; golden eggs are high or far, where reaching them costs fuel.
 */
export function generateSpawnPoints(rng, { trees = [], normalCount = 70, goldenAerialCount = 14 } = {}) {
  const normal = [];
  const golden = [];
  const maxRadius = WORLD.playRadius - 3;

  let attempts = 0;
  while (normal.length < normalCount && attempts < normalCount * 20) {
    attempts += 1;
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * maxRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (isNearAnyTree(x, z, trees)) continue;
    const floating = rng() < 0.5;
    const lift = floating ? randomRange(rng, 3.5, 9) : EGG_HOVER;
    normal.push({ x, y: terrainHeightAt(x, z) + lift, z });
  }

  for (const rock of FLOATING_ROCKS) {
    golden.push({ x: rock.x, y: rock.top + EGG_HOVER, z: rock.z });
  }
  for (let i = 0; i < goldenAerialCount; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = randomRange(rng, 30, maxRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = Math.min(WORLD.ceiling - 4, terrainHeightAt(x, z) + randomRange(rng, 14, 22));
    golden.push({ x, y, z });
  }

  return { normal, golden };
}

function isFree(point, eggs) {
  return eggs.every((egg) => Math.hypot(point.x - egg.x, point.y - egg.y, point.z - egg.z) >= EGGS.minEggSpacing);
}

function isFarFromPlayer(point, player) {
  return Math.hypot(point.x - player.x, point.z - player.z) >= EGGS.minSpawnDistance;
}

/** Picks a free spawn point away from the player, or null when none is available. */
export function pickSpawnPoint(points, eggs, player, rng) {
  for (let i = 0; i < SPAWN_ATTEMPTS; i += 1) {
    const point = points[Math.floor(rng() * points.length)];
    if (point && isFree(point, eggs) && isFarFromPlayer(point, player)) return point;
  }
  return (
    points.find((point) => isFree(point, eggs) && isFarFromPlayer(point, player)) ??
    points.find((point) => isFree(point, eggs)) ??
    null
  );
}

export function createEgg(id, kind, point) {
  return {
    id,
    kind,
    x: point.x,
    y: point.y,
    z: point.z,
    age: 0,
    lifetime: kind === EGG_KINDS.golden ? EGGS.goldenLifetime : Infinity,
  };
}

export function eggPoints(kind) {
  return kind === EGG_KINDS.golden ? EGGS.goldenPoints : EGGS.normalPoints;
}

/** Eggs whose center is within reach of the dino's body (its center is above its feet). */
export function findCollectedEggs(eggs, player, radius = EGGS.pickupRadius) {
  const centerY = player.y + 1.1;
  return eggs.filter((egg) => Math.hypot(egg.x - player.x, egg.y - centerY, egg.z - player.z) <= radius);
}

/** Advances egg ages and returns the eggs that just expired. */
export function ageEggs(eggs, dt) {
  const expired = [];
  for (const egg of eggs) {
    egg.age += dt;
    if (egg.age >= egg.lifetime) expired.push(egg);
  }
  return expired;
}
