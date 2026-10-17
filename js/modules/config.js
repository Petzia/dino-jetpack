// Every gameplay number lives here so the feel of the game can be tuned in one place.

export const GAME_DURATION = 120; // seconds
export const FINAL_COUNTDOWN = 10; // seconds with a ticking sound before the end
export const MAX_FRAME_DT = 0.05; // clamp long frames so physics never explodes

export const WORLD = Object.freeze({
  islandRadius: 110, // where the land meets the sea
  playRadius: 85, // invisible soft wall keeping the dino above land
  ceiling: 55,
  size: 240, // terrain mesh width and depth
});

export const PLAYER = Object.freeze({
  gravity: 15,
  thrust: 28, // upward acceleration while the jetpack fires (net +13 against gravity)
  maxRiseSpeed: 11,
  maxFallSpeed: 20,
  airMaxSpeed: 17,
  groundMaxSpeed: 9,
  backwardFactor: 0.5,
  airResponse: 2.5, // how fast horizontal speed reaches its target in the air
  airDrift: 0.8, // slow down rate in the air with no input (floaty momentum)
  groundResponse: 9,
  turnRate: 2.8, // radians per second
  fuelDrainPerSecond: 1 / 5, // about 5 seconds of full thrust
  fuelRefillPerSecond: 1 / 1.5, // about 1.5 seconds to refill on the ground
  bodyRadius: 0.8,
  bodyHeight: 2.2,
});

export const EGGS = Object.freeze({
  normalCount: 12,
  goldenMax: 2,
  goldenLifetime: 8,
  goldenRespawnDelay: 3,
  pickupRadius: 2.4,
  minSpawnDistance: 15,
  minEggSpacing: 5,
  normalPoints: 1,
  goldenPoints: 5,
});

export const COMBO = Object.freeze({
  maxMultiplier: 5,
});

export const CAMERA = Object.freeze({
  distance: 11,
  height: 6.5,
  lookAhead: 3,
  lookHeight: 1.6,
  followRate: 4, // higher = snappier camera
  minClearance: 1.5, // keep the camera above the ground
});

export const STORAGE_KEYS = Object.freeze({
  bestScore: 'dino-jetpack:best-score',
  muted: 'dino-jetpack:muted',
});

export const MAX_STORED_SCORE = 9_999_999;
