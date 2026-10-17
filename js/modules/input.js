import { clamp } from './math.js';

// event.code is the physical key, so WASD also matches ZQSD on an AZERTY keyboard.
const KEY_BINDINGS = Object.freeze({
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'thrust',
});

const JOYSTICK_RADIUS = 55; // pixels
const JOYSTICK_DEADZONE = 0.15;

/** Converts a finger offset (pixels, y down) into a normalized stick vector. */
export function joystickVector(dx, dy, radius = JOYSTICK_RADIUS, deadzone = JOYSTICK_DEADZONE) {
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 0 };
  const magnitude = Math.min(length / radius, 1);
  if (magnitude < deadzone) return { x: 0, y: 0 };
  const scaled = (magnitude - deadzone) / (1 - deadzone);
  return { x: (dx / length) * scaled, y: (dy / length) * scaled };
}

/** Merges keyboard and touch into one control state for the game logic. */
export function combineInput(keys, stick, touchThrust) {
  const keyTurn = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  const keyForward = (keys.has('forward') ? 1 : 0) - (keys.has('backward') ? 1 : 0);
  return {
    turn: clamp(keyTurn + stick.x, -1, 1),
    forward: clamp(keyForward - stick.y, -1, 1),
    thrust: keys.has('thrust') || touchThrust,
  };
}

function setupKeyboard(keys, shouldCapture) {
  const onKeyDown = (event) => {
    const action = KEY_BINDINGS[event.code];
    if (!action || !shouldCapture()) return;
    event.preventDefault(); // keep Space and arrows from scrolling or pressing buttons
    keys.add(action);
  };
  const onKeyUp = (event) => {
    const action = KEY_BINDINGS[event.code];
    if (action) keys.delete(action);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => keys.clear());
}

function setupJoystick(zone, base, knob, stick) {
  let activePointer = null;
  let originX = 0;
  let originY = 0;

  const reset = () => {
    activePointer = null;
    stick.x = 0;
    stick.y = 0;
    base.classList.remove('is-active');
    knob.style.transform = 'translate(-50%, -50%)';
  };

  zone.addEventListener('pointerdown', (event) => {
    if (activePointer !== null) return;
    activePointer = event.pointerId;
    zone.setPointerCapture(event.pointerId);
    const rect = zone.getBoundingClientRect();
    originX = event.clientX;
    originY = event.clientY;
    base.style.left = `${originX - rect.left}px`;
    base.style.top = `${originY - rect.top}px`;
    base.classList.add('is-active');
  });

  zone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointer) return;
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const vector = joystickVector(dx, dy);
    stick.x = vector.x;
    stick.y = vector.y;
    const length = Math.hypot(dx, dy) || 1;
    const shown = Math.min(length, JOYSTICK_RADIUS);
    const offsetX = (dx / length) * shown;
    const offsetY = (dy / length) * shown;
    knob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  });

  const end = (event) => {
    if (event.pointerId === activePointer) reset();
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  reset();
}

function setupThrustButton(button, touch) {
  const press = (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touch.thrust = true;
    button.classList.add('is-pressed');
  };
  const release = () => {
    touch.thrust = false;
    button.classList.remove('is-pressed');
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

/**
 * Wires keyboard and touch controls.
 * elements: { joystickZone, joystickBase, joystickKnob, thrustButton }
 * shouldCapture: returns true while gameplay keys must be captured.
 */
export function createInput(elements, shouldCapture) {
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  const touch = { thrust: false };

  setupKeyboard(keys, shouldCapture);
  setupJoystick(elements.joystickZone, elements.joystickBase, elements.joystickKnob, stick);
  setupThrustButton(elements.thrustButton, touch);

  return {
    read: () => combineInput(keys, stick, touch.thrust),
  };
}
