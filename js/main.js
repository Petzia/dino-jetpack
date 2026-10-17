import { createAudio } from './modules/audio.js';
import { byId } from './modules/dom.js';
import { MAX_FRAME_DT } from './modules/config.js';
import { EGG_KINDS } from './modules/eggs.js';
import { PHASES, createGame, startGame, updateGame } from './modules/game.js';
import { createHud } from './modules/hud.js';
import { createInput } from './modules/input.js';
import { createDino } from './modules/render/dino.js';
import { createEggView } from './modules/render/eggs.js';
import { createChaseCamera, createRenderer } from './modules/render/scene.js';
import { buildWorld } from './modules/render/world.js';
import { loadBestScore, loadMuted, saveBestScore, saveMuted } from './modules/storage.js';

const WORLD_SEED = 20261017;
const RESTART_GUARD_MS = 800; // ignore a held key or tap right after the game ends

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function createScreens() {
  const screens = {
    start: byId('start-screen'),
    pause: byId('pause-screen'),
    over: byId('over-screen'),
  };
  return {
    show(name) {
      for (const [key, element] of Object.entries(screens)) element.hidden = key !== name;
    },
    hideAll() {
      for (const element of Object.values(screens)) element.hidden = true;
    },
  };
}

function setupTouchControls(container) {
  if (window.matchMedia('(pointer: coarse)').matches) {
    container.hidden = false;
    return;
  }
  const onPointerDown = (event) => {
    if (event.pointerType !== 'touch') return;
    container.hidden = false;
    window.removeEventListener('pointerdown', onPointerDown);
  };
  window.addEventListener('pointerdown', onPointerDown);
}

function showGameOver(score, isRecord) {
  byId('over-score').textContent = String(score.points);
  byId('over-eggs').textContent = String(score.eggs);
  byId('over-chain').textContent = String(score.bestChain);
  byId('over-record').hidden = !isRecord;
}

function main() {
  if (!hasWebGL()) {
    byId('webgl-error').hidden = false;
    byId('start-screen').hidden = true;
    return;
  }

  const storage = getStorage();
  // Fixed island layout, but a different egg sequence every game.
  const game = createGame(WORLD_SEED, { eggRng: Math.random });

  const { scene, camera, render } = createRenderer(byId('game-canvas'));
  const world = buildWorld(scene, { trees: game.trees, seed: WORLD_SEED });
  const dino = createDino(scene);
  const eggView = createEggView(scene);
  const chaseCamera = createChaseCamera(camera);
  const hud = createHud();
  const screens = createScreens();
  const audio = createAudio(loadMuted(storage));

  let best = loadBestScore(storage);
  let paused = false;

  const isPlaying = () => game.phase === PHASES.playing && !paused;
  const input = createInput(
    {
      joystickZone: byId('joystick-zone'),
      joystickBase: byId('joystick-base'),
      joystickKnob: byId('joystick-knob'),
      thrustButton: byId('thrust-button'),
    },
    isPlaying,
  );
  setupTouchControls(byId('touch-controls'));

  const startBest = byId('start-best');
  const overBest = byId('over-best');
  const restartButton = byId('restart-button');
  const muteButton = byId('mute-button');

  function showBest() {
    startBest.textContent = String(best);
    overBest.textContent = String(best);
    hud.setBest(best);
  }

  function refreshMuteButton() {
    const muted = audio.isMuted();
    muteButton.textContent = muted ? '🔇' : '🔊';
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son');
  }

  function toggleMute() {
    audio.setMuted(!audio.isMuted());
    saveMuted(storage, audio.isMuted());
    refreshMuteButton();
  }

  function play() {
    audio.unlock();
    startGame(game);
    paused = false;
    chaseCamera.snap();
    screens.hideAll();
    hud.show(true);
    document.body.classList.add('is-playing');
    document.activeElement?.blur();
    audio.start();
  }

  function setPaused(value) {
    if (game.phase !== PHASES.playing || paused === value) return;
    paused = value;
    audio.setThrust(false);
    if (paused) {
      screens.show('pause');
      byId('resume-button').focus();
    } else {
      audio.unlock();
      screens.hideAll();
      document.activeElement?.blur();
    }
  }

  function endGame() {
    document.body.classList.remove('is-playing');
    audio.setThrust(false);
    audio.gameOver();
    // Decide the record from memory so a blocked storage never fakes one.
    const isRecord = game.score.points > best;
    if (isRecord) {
      best = game.score.points;
      saveBestScore(storage, best);
    }
    showBest();
    showGameOver(game.score, isRecord);
    screens.show('over');
    restartButton.disabled = true;
    setTimeout(() => {
      restartButton.disabled = false;
      restartButton.focus();
    }, RESTART_GUARD_MS);
  }

  function handleEvents(events) {
    for (const event of events) {
      switch (event.type) {
        case 'egg':
          if (event.kind === EGG_KINDS.golden) audio.golden();
          else audio.egg(event.multiplier);
          hud.popup(event.gained, event.multiplier);
          break;
        case 'landed':
          audio.landed(event.lostChain);
          break;
        case 'fuelEmpty':
          audio.fuelEmpty();
          break;
        case 'tick':
          audio.tick();
          break;
        case 'over':
          endGame();
          break;
        default:
          break;
      }
    }
  }

  byId('start-button').addEventListener('click', play);
  restartButton.addEventListener('click', play);
  byId('resume-button').addEventListener('click', () => setPaused(false));
  byId('pause-button').addEventListener('click', () => setPaused(true));
  muteButton.addEventListener('click', toggleMute);

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'KeyP' || event.code === 'Escape') setPaused(!paused);
    if (event.code === 'KeyM') toggleMute();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      setPaused(true);
      audio.suspend();
    }
  });

  showBest();
  refreshMuteButton();
  byId('start-button').focus();

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME_DT);
    last = now;

    if (isPlaying()) {
      handleEvents(updateGame(game, input.read(), dt));
      audio.setThrust(game.player.thrusting && game.phase === PHASES.playing);
    }

    const groundY = game.world.surfaceAt(game.player.x, game.player.z, game.player.y);
    dino.update(game.player, groundY, dt, now / 1000);
    eggView.update(game.eggs, now / 1000);
    world.update(dt);
    chaseCamera.update(game.player, dt);
    if (game.phase !== PHASES.ready) hud.update(game);
    render();
  }
  requestAnimationFrame(frame);
}

main();
