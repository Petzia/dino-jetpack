import { FINAL_COUNTDOWN } from './config.js';
import { byId } from './dom.js';
import { EGG_KINDS } from './eggs.js';
import { formatTime, nearestEgg, screenAngleTo } from './navigation.js';
import { multiplierFor } from './scoring.js';

const LOW_FUEL = 0.25;
const POPUP_DURATION = 900; // ms

/** Writes text only when it changed, to avoid touching the DOM every frame. */
function setText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

export function createHud() {
  const el = {
    hud: byId('hud'),
    score: byId('hud-score'),
    combo: byId('hud-combo'),
    multiplier: byId('hud-multiplier'),
    popup: byId('hud-popup'),
    time: byId('hud-time'),
    compass: byId('hud-compass'),
    compassArrow: byId('hud-compass-arrow'),
    best: byId('hud-best'),
    fuelBar: byId('fuel-bar'),
  };
  let popupTimer = 0;

  return {
    show(visible) {
      el.hud.hidden = !visible;
    },
    setBest(best) {
      setText(el.best, best);
    },
    update(game) {
      const { player, score } = game;
      setText(el.score, score.points);
      setText(el.time, formatTime(game.timeLeft));
      el.time.classList.toggle('is-urgent', game.timeLeft <= FINAL_COUNTDOWN);

      const showCombo = !player.grounded && score.chain > 0;
      el.combo.hidden = !showCombo;
      if (showCombo) setText(el.multiplier, multiplierFor(score.chain));

      el.fuelBar.style.transform = `scaleX(${player.fuel.toFixed(3)})`;
      el.fuelBar.classList.toggle('is-low', player.fuel < LOW_FUEL);

      const golden = nearestEgg(game.eggs.filter((egg) => egg.kind === EGG_KINDS.golden), player);
      el.compass.hidden = !golden;
      if (golden) el.compassArrow.style.transform = `rotate(${screenAngleTo(player.heading, player, golden).toFixed(3)}rad)`;
    },
    popup(gained, multiplier) {
      el.popup.textContent = multiplier > 1 ? `+${gained} (×${multiplier})` : `+${gained}`;
      el.popup.classList.add('is-visible');
      clearTimeout(popupTimer);
      popupTimer = setTimeout(() => el.popup.classList.remove('is-visible'), POPUP_DURATION);
    },
  };
}
