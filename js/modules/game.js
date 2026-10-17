import { EGGS, FINAL_COUNTDOWN, GAME_DURATION } from './config.js';
import { EGG_KINDS, ageEggs, createEgg, eggPoints, findCollectedEggs, generateSpawnPoints, pickSpawnPoint } from './eggs.js';
import { DEFAULT_WORLD, createPlayer, stepPlayer } from './physics.js';
import { createRng } from './random.js';
import { generateTrees } from './scenery.js';
import { createScore, registerEgg, registerLanding } from './scoring.js';

export const PHASES = Object.freeze({ ready: 'ready', playing: 'playing', over: 'over' });

const START_POSITION = Object.freeze({ x: 0, z: -6 });

/**
 * Creates the full game state. Pure logic: no DOM, no three.js.
 * The same seed always produces the same island decoration and spawn points;
 * eggRng decides which spawn points are used (seeded by default for tests).
 */
export function createGame(seed = 1, { world = DEFAULT_WORLD, eggRng = createRng(seed + 1) } = {}) {
  const layoutRng = createRng(seed);
  const trees = generateTrees(layoutRng);
  const spawnPoints = generateSpawnPoints(layoutRng, { trees });
  return {
    phase: PHASES.ready,
    world,
    trees,
    spawnPoints,
    rng: eggRng,
    player: createPlayer(START_POSITION.x, START_POSITION.z, world),
    eggs: [],
    score: createScore(),
    timeLeft: GAME_DURATION,
    goldenCooldown: 0,
    nextEggId: 1,
  };
}

function spawnEgg(game, kind) {
  const points = kind === EGG_KINDS.golden ? game.spawnPoints.golden : game.spawnPoints.normal;
  const point = pickSpawnPoint(points, game.eggs, game.player, game.rng);
  if (!point) return null;
  const egg = createEgg(game.nextEggId, kind, point);
  game.nextEggId += 1;
  game.eggs.push(egg);
  return egg;
}

function countEggs(game, kind) {
  return game.eggs.filter((egg) => egg.kind === kind).length;
}

function refillEggs(game) {
  while (countEggs(game, EGG_KINDS.normal) < EGGS.normalCount) {
    if (!spawnEgg(game, EGG_KINDS.normal)) break;
  }
  if (game.goldenCooldown <= 0 && countEggs(game, EGG_KINDS.golden) < EGGS.goldenMax) {
    spawnEgg(game, EGG_KINDS.golden);
    game.goldenCooldown = EGGS.goldenRespawnDelay;
  }
}

function removeEggs(game, eggsToRemove) {
  if (eggsToRemove.length === 0) return;
  const ids = new Set(eggsToRemove.map((egg) => egg.id));
  game.eggs = game.eggs.filter((egg) => !ids.has(egg.id));
}

export function startGame(game) {
  game.phase = PHASES.playing;
  game.player = createPlayer(START_POSITION.x, START_POSITION.z, game.world);
  game.eggs = [];
  game.score = createScore();
  game.timeLeft = GAME_DURATION;
  game.goldenCooldown = 0;
  refillEggs(game);
  game.goldenCooldown = 0; // let the second golden egg appear right away too
  refillEggs(game);
}

function collectEggs(game, airborne, events) {
  const collected = findCollectedEggs(game.eggs, game.player);
  for (const egg of collected) {
    const { gained, multiplier } = registerEgg(game.score, eggPoints(egg.kind), airborne);
    events.push({ type: 'egg', kind: egg.kind, gained, multiplier, x: egg.x, y: egg.y, z: egg.z });
  }
  removeEggs(game, collected);
}

function updateTimer(game, dt, events) {
  const before = Math.ceil(game.timeLeft);
  game.timeLeft = Math.max(0, game.timeLeft - dt);
  const after = Math.ceil(game.timeLeft);
  if (after < before && after > 0 && after <= FINAL_COUNTDOWN) {
    events.push({ type: 'tick', secondsLeft: after });
  }
  if (game.timeLeft === 0) {
    game.phase = PHASES.over;
    game.player.thrusting = false;
    events.push({ type: 'over', score: game.score.points });
  }
}

/**
 * Advances the game by dt seconds and returns the events that happened,
 * so the view and audio layers can react without knowing the rules.
 * input: { turn: -1..1, forward: -1..1, thrust: boolean }
 */
export function updateGame(game, input, dt) {
  const events = [];
  if (game.phase !== PHASES.playing) return events;

  const step = stepPlayer(game.player, input, dt, game.world);
  if (step.tookOff) events.push({ type: 'takeoff' });
  if (step.fuelEmptied) events.push({ type: 'fuelEmpty' });

  // An egg grabbed on the very frame of touchdown still counts as caught in the air.
  collectEggs(game, !game.player.grounded || step.landed, events);

  if (step.landed) {
    const lostChain = registerLanding(game.score);
    events.push({ type: 'landed', lostChain });
  }

  const expired = ageEggs(game.eggs, dt);
  for (const egg of expired) events.push({ type: 'eggExpired', kind: egg.kind });
  removeEggs(game, expired);

  game.goldenCooldown = Math.max(0, game.goldenCooldown - dt);
  refillEggs(game);
  updateTimer(game, dt, events);
  return events;
}
