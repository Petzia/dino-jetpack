// Every sound is synthesized with the Web Audio API: no audio files to download.

const MASTER_VOLUME = 0.5;

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playTone(context, output, { frequency, endFrequency = frequency, duration, type = 'sine', volume = 0.3, delay = 0 }) {
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function playNoiseBurst(context, output, noise, { duration, frequency, volume }) {
  const start = context.currentTime;
  const source = context.createBufferSource();
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = frequency;
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(output);
  source.start(start);
  source.stop(start + duration + 0.05);
}

function createThrustLoop(context, output, noise) {
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500;
  filter.Q.value = 0.7;
  const gain = context.createGain();
  gain.gain.value = 0;
  source.connect(filter).connect(gain).connect(output);
  source.start();
  return gain;
}

/**
 * Game sound effects. The AudioContext is created lazily on the first user
 * gesture (browsers block audio before that).
 */
export function createAudio(initiallyMuted) {
  let context = null;
  let master = null;
  let noise = null;
  let thrustGain = null;
  let muted = initiallyMuted;
  let thrustActive = false;

  function ensureContext() {
    if (context) return true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(context.destination);
    noise = createNoiseBuffer(context);
    thrustGain = createThrustLoop(context, master, noise);
    return true;
  }

  const ready = () => context && context.state === 'running' && !muted;

  return {
    /** Call from a user gesture (click, key press) to unlock audio. */
    unlock() {
      if (ensureContext() && context.state === 'suspended') context.resume();
    },
    suspend() {
      context?.suspend();
    },
    isMuted: () => muted,
    setMuted(value) {
      muted = value;
      if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, context.currentTime, 0.02);
    },
    setThrust(active) {
      if (!thrustGain || active === thrustActive) return;
      thrustActive = active;
      thrustGain.gain.setTargetAtTime(active ? 0.35 : 0, context.currentTime, 0.05);
    },
    egg(multiplier) {
      if (!ready()) return;
      const base = 520 * 1.12 ** (multiplier - 1); // pitch rises with the combo
      playTone(context, master, { frequency: base, endFrequency: base * 1.5, duration: 0.14, type: 'triangle' });
    },
    golden() {
      if (!ready()) return;
      [660, 880, 1320].forEach((frequency, index) => {
        playTone(context, master, { frequency, duration: 0.18, type: 'triangle', volume: 0.25, delay: index * 0.07 });
      });
    },
    landed(lostChain) {
      if (!ready()) return;
      playNoiseBurst(context, master, noise, { duration: 0.18, frequency: 400, volume: 0.5 });
      if (lostChain > 1) playTone(context, master, { frequency: 300, endFrequency: 180, duration: 0.25, type: 'sawtooth', volume: 0.08 });
    },
    fuelEmpty() {
      if (!ready()) return;
      playTone(context, master, { frequency: 180, endFrequency: 120, duration: 0.3, type: 'square', volume: 0.08 });
    },
    tick() {
      if (!ready()) return;
      playTone(context, master, { frequency: 1000, duration: 0.06, type: 'square', volume: 0.06 });
    },
    gameOver() {
      if (!ready()) return;
      [784, 659, 523, 392].forEach((frequency, index) => {
        playTone(context, master, { frequency, duration: 0.25, type: 'triangle', volume: 0.22, delay: index * 0.15 });
      });
    },
    start() {
      if (!ready()) return;
      [392, 523, 659, 784].forEach((frequency, index) => {
        playTone(context, master, { frequency, duration: 0.15, type: 'triangle', volume: 0.2, delay: index * 0.08 });
      });
    },
  };
}
