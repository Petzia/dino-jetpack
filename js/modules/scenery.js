import { WORLD } from './config.js';
import { randomRange } from './random.js';
import { terrainHeightAt } from './terrain.js';

const START_CLEARING = 10; // keep the spawn area free

function randomPointOnLand(rng, maxRadius) {
  const angle = rng() * Math.PI * 2;
  const radius = Math.sqrt(rng()) * maxRadius;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  return { x, z, y: terrainHeightAt(x, z) };
}

function isFarFromAll(point, others, minDistance) {
  return others.every((other) => Math.hypot(point.x - other.x, point.z - other.z) >= minDistance);
}

/** Decorative trees on gentle, mid-height land. Deterministic for a given rng. */
export function generateTrees(rng, count = 110) {
  const trees = [];
  let attempts = 0;
  while (trees.length < count && attempts < count * 20) {
    attempts += 1;
    const point = randomPointOnLand(rng, WORLD.islandRadius * 0.85);
    if (point.y < 1.2 || point.y > 12) continue;
    if (Math.hypot(point.x, point.z) < START_CLEARING) continue;
    if (!isFarFromAll(point, trees, 3)) continue;
    trees.push({
      ...point,
      scale: randomRange(rng, 0.8, 1.6),
      rotation: rng() * Math.PI * 2,
      round: rng() < 0.35,
      tint: rng(),
    });
  }
  return trees;
}

/** Small decorative boulders, anywhere on land. */
export function generateBoulders(rng, count = 40) {
  const boulders = [];
  for (let i = 0; i < count; i += 1) {
    const point = randomPointOnLand(rng, WORLD.islandRadius * 0.88);
    if (point.y < 0.5) continue;
    boulders.push({ ...point, scale: randomRange(rng, 0.5, 1.6), rotation: rng() * Math.PI * 2 });
  }
  return boulders;
}

export function generateClouds(rng, count = 14) {
  const clouds = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = randomRange(rng, 20, 140);
    clouds.push({
      x: Math.cos(angle) * radius,
      y: randomRange(rng, 42, 58),
      z: Math.sin(angle) * radius,
      scale: randomRange(rng, 2, 4),
    });
  }
  return clouds;
}
