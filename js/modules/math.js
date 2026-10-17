export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Wraps an angle to the range [-PI, PI). */
export function wrapAngle(angle) {
  const twoPi = Math.PI * 2;
  return ((((angle + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
}

/** Interpolates between two angles along the shortest arc. */
export function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * t;
}

/** Frame-rate independent smoothing factor for exponential approach. */
export function dampFactor(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}
