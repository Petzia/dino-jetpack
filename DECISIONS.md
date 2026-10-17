# Decisions

## Agreed scope (v1)

The idea was challenged before building. Agreed with the user:

- **Feel**: arcade and forgiving (floaty flight, about 5 s of thrust, refuel in about 1.5 s on the ground).
- **Combo rule**: each egg caught in the air raises a multiplier (×1, ×2 … up to ×5); landing resets it.
  Eggs picked up while walking are always worth their base value. This makes every landing a choice:
  refuel safely, or push on for the combo.
- **Eggs**: normal (1 pt, on the ground or floating low) and golden (5 pts, high up or on floating
  rocks, disappear after 8 s). About 12 normal and 2 golden eggs exist at any time.
- **Phone**: landscape only (a "rotate your phone" hint shows in portrait).
- **Included in v1**: flight physics with fuel, both egg types and the combo, chase camera,
  keyboard and touch controls, 2-minute timer, score, best score, start / pause / game over screens,
  and synthesized sound effects.
- **Later**: clock eggs (+5 s), hazards (pterodactyls, wind), particles, daily seed, optional camera
  drag, gamepad support.

## Technical decisions

### three.js is the only dependency (vendored, pinned to 0.186.1)
3D rendering is the textbook case where rewriting a library is unreasonable. The two ES module
files (`three.module.js` and `three.core.js`, which it imports) are copied into `vendor/three/`
together with the MIT license, instead of being loaded from a CDN:
- the page works with a strict CSP (`script-src 'self'`) and with no import map, which would need
  an inline script;
- no build step, no `npm install`, and the version cannot change behind our back.
Source: the npm package `three@0.186.1`. SHA-256 hashes:
- `three.module.js`: `9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea`
- `three.core.js`: `9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6`

To upgrade: `npm pack three@<version>`, copy `build/three.module.js`, `build/three.core.js` and
`LICENSE` into `vendor/three/`, and update the version and hashes here.

### Game logic is pure and separate from rendering
Everything in `js/modules/*.js` except `audio.js`, `hud.js` and `input.js`'s DOM wiring is plain
logic with no DOM or three.js, so `node --test` can check it. `game.js` returns events (`egg`,
`landed`, `tick`, `over`…) that the view, HUD and audio react to. three.js code lives in
`js/modules/render/`.

### Home-made physics, no physics engine
Gravity, thrust, exponential velocity smoothing, ground height from a deterministic
`terrainHeightAt(x, z)` function, and cylinder collisions for floating rocks. Trees and boulders
are decoration only, with no collision, to keep flight smooth and forgiving.

### Tank-style controls with an automatic chase camera
Left and right turn the dino and up and down move forward and back. The camera always follows from
behind, so "forward" never changes meaning. Players don't control the camera, which is the main
risk on touch screens. A small compass under the timer points to the nearest golden egg.
Keyboard bindings use `event.code`, so WASD and ZQSD (AZERTY) both work.

### Performance on phones
- Pixel ratio capped at 1.5, antialiasing only below that.
- Lambert materials with flat shading and no real-time shadows (a blob shadow under the dino).
- Trees, boulders, clouds and normal eggs use `InstancedMesh`. About 45 draw calls in total.
- Fog hides the far terrain, and the camera's far plane is 260.

### Sound is synthesized
All effects use the Web Audio API (oscillators and noise), so there are no audio files to download.
The audio context starts on the first click, as browsers require. Mute is remembered.

### Storage
The best score and the mute flag are kept in `localStorage`. Values are validated when read
(digits only, capped) and storage errors (private mode) are ignored.

### Fixed island, random eggs
The island layout uses a fixed seed (the same island every game, so players can learn it), while
egg placement uses `Math.random` so every game plays differently. Tests use seeded randomness.
