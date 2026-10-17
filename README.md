# Dino Jetpack

A small low poly 3D browser game. You fly a jetpack dinosaur over an island and collect as many
eggs as you can in 2 minutes.

- The jetpack burns fuel. **Land to refuel.**
- Catch eggs **without touching the ground** to build a combo (up to ×5). Landing resets it.
- **Golden eggs** are worth 5 points, sit high up or on floating rocks, and vanish after 8 seconds.
  The arrow under the timer points to the nearest one.
- Your best score is saved in the browser.

## Controls

| Action | Keyboard | Touch (landscape) |
| --- | --- | --- |
| Move forward / back | `W` `S` (`Z` `S` on AZERTY) or ↑ ↓ | Left joystick up / down |
| Turn | `A` `D` (`Q` `D` on AZERTY) or ← → | Left joystick left / right |
| Jetpack | `Space` | 🔥 button |
| Pause | `P` or `Esc` | ⏸ button |
| Sound on / off | `M` | 🔊 button |

## Run it

No install and no build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000>. To try it on a phone, open the same address using your
computer's local IP address while both are on the same network.

Opening `index.html` directly as a `file://` page does not work, because browsers block ES modules there.

## Tests

```sh
node --test
```

The tests cover the pure game logic: physics, fuel, terrain, egg spawning, combo and score, the
timer, camera math, input mapping and best score storage.

## Project structure

```
index.html              page, HUD and screens (strict CSP)
css/style.css
js/main.js              wires everything together and runs the game loop
js/modules/             pure game logic (testable with Node)
  config.js             all tuning numbers
  game.js               game state, rules and events
  physics.js            flight, fuel, collisions
  terrain.js            island height function and floating rocks
  eggs.js / scoring.js  egg spawning and the combo score
  scenery.js            tree, boulder and cloud placement
  navigation.js         timer format, compass and camera math
  storage.js            best score and mute in localStorage
  input.js              keyboard and touch controls
  hud.js / audio.js     DOM HUD and synthesized sounds
js/modules/render/      three.js scene, dino model, eggs and camera
vendor/three/           three.js 0.186.1 (MIT), the only dependency
tests/                  node --test
```

See `DECISIONS.md` for the reasoning behind these choices.
