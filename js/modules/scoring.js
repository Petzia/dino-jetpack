import { COMBO } from './config.js';

export function createScore() {
  return { points: 0, eggs: 0, chain: 0, bestChain: 0 };
}

/** Multiplier applied to the next airborne egg, given how many were chained in this flight. */
export function multiplierFor(chain) {
  return Math.min(1 + chain, COMBO.maxMultiplier);
}

/**
 * Adds an egg to the score. Only eggs caught in the air build the combo;
 * eggs picked up while walking are always worth their base value.
 */
export function registerEgg(score, basePoints, airborne) {
  const multiplier = airborne ? multiplierFor(score.chain) : 1;
  const gained = basePoints * multiplier;
  score.points += gained;
  score.eggs += 1;
  if (airborne) {
    score.chain += 1;
    score.bestChain = Math.max(score.bestChain, score.chain);
  }
  return { gained, multiplier };
}

/** Touching the ground ends the combo. Returns the chain that was lost. */
export function registerLanding(score) {
  const lost = score.chain;
  score.chain = 0;
  return lost;
}
