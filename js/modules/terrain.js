import { WORLD } from './config.js';
import { lerp, smoothstep } from './math.js';

const SEA_FLOOR = -4;
const MIN_LAND_HEIGHT = 1;

const MOUNTAINS = Object.freeze([
  { x: 38, z: -30, height: 16, width: 20 },
  { x: -42, z: 34, height: 13, width: 17 },
  { x: -18, z: -52, height: 9, width: 14 },
]);

/** Floating rock platforms: flat tops you can land on, usually holding golden eggs. */
export const FLOATING_ROCKS = Object.freeze([
  { x: 8, z: 42, top: 22, radius: 5, thickness: 3 },
  { x: 55, z: 22, top: 27, radius: 4.5, thickness: 3 },
  { x: -56, z: -14, top: 20, radius: 5, thickness: 3 },
  { x: 18, z: 62, top: 25, radius: 4.5, thickness: 3 },
  { x: -28, z: -64, top: 29, radius: 4, thickness: 3 },
].map(Object.freeze));

function mountainHeight(x, z) {
  let total = 0;
  for (const mountain of MOUNTAINS) {
    const dx = x - mountain.x;
    const dz = z - mountain.z;
    total += mountain.height * Math.exp(-(dx * dx + dz * dz) / (mountain.width * mountain.width));
  }
  return total;
}

/** Height of the island ground (without floating rocks). Deterministic and pure. */
export function terrainHeightAt(x, z) {
  const hills =
    4 +
    3.5 * Math.sin(x * 0.045 + 0.5) * Math.cos(z * 0.05) +
    1.5 * Math.sin(x * 0.12) * Math.sin(z * 0.1 + 1) +
    mountainHeight(x, z);
  const land = Math.max(MIN_LAND_HEIGHT, hills);
  const distance = Math.hypot(x, z) / WORLD.islandRadius;
  const landWeight = 1 - smoothstep(0.78, 0.95, distance);
  return lerp(SEA_FLOOR, land, landWeight);
}

export function rockBottom(rock) {
  return rock.top - rock.thickness;
}

export function isOverRock(rock, x, z, margin = 0) {
  return Math.hypot(x - rock.x, z - rock.z) < rock.radius + margin;
}

/**
 * Height of the surface the player would stand on at (x, z), given the height it
 * comes from. A rock top only counts when the player was already above it.
 */
export function surfaceHeightAt(x, z, fromY, rocks = FLOATING_ROCKS) {
  let height = terrainHeightAt(x, z);
  for (const rock of rocks) {
    if (fromY >= rock.top - 0.05 && isOverRock(rock, x, z)) {
      height = Math.max(height, rock.top);
    }
  }
  return height;
}
