import { CAMERA } from './config.js';
import { wrapAngle } from './math.js';
import { isOverRock, rockBottom } from './terrain.js';

const ROCK_CLEARANCE = 1.5;

/** Formats seconds as m:ss, rounding up so the display reads 0:00 only at the very end. */
export function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

/**
 * Angle of a target relative to where the dino faces, as a screen rotation:
 * 0 = straight ahead, positive = to the right (clockwise), in radians.
 */
export function screenAngleTo(heading, from, to) {
  const targetHeading = Math.atan2(to.x - from.x, to.z - from.z);
  return -wrapAngle(targetHeading - heading);
}

/** Returns the egg closest to the player, or null. */
export function nearestEgg(eggs, player) {
  let best = null;
  let bestDistance = Infinity;
  for (const egg of eggs) {
    const distance = Math.hypot(egg.x - player.x, egg.z - player.z);
    if (distance < bestDistance) {
      best = egg;
      bestDistance = distance;
    }
  }
  return best;
}

/** Moves the camera out of a floating rock: above it, or below it when the dino is underneath. */
function avoidRocks(x, y, z, target, rocks) {
  let safeY = y;
  for (const rock of rocks) {
    const bottom = rockBottom(rock);
    const inside = safeY > bottom - ROCK_CLEARANCE && safeY < rock.top + ROCK_CLEARANCE;
    if (!inside || !isOverRock(rock, x, z, ROCK_CLEARANCE)) continue;
    safeY = target.y >= bottom ? rock.top + ROCK_CLEARANCE : Math.max(target.y + 1, bottom - ROCK_CLEARANCE);
  }
  return safeY;
}

/** Where the chase camera wants to be for a target position and a camera heading. */
export function chaseCameraTarget(target, heading, groundAt, rocks = []) {
  const dirX = Math.sin(heading);
  const dirZ = Math.cos(heading);
  const x = target.x - dirX * CAMERA.distance;
  const z = target.z - dirZ * CAMERA.distance;
  const aboveGround = Math.max(target.y + CAMERA.height, groundAt(x, z) + CAMERA.minClearance);
  const y = avoidRocks(x, aboveGround, z, target, rocks);
  return {
    position: { x, y, z },
    lookAt: {
      x: target.x + dirX * CAMERA.lookAhead,
      y: target.y + CAMERA.lookHeight,
      z: target.z + dirZ * CAMERA.lookAhead,
    },
  };
}
