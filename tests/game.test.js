import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EGGS, FINAL_COUNTDOWN, GAME_DURATION } from '../js/modules/config.js';
import { EGG_KINDS, createEgg } from '../js/modules/eggs.js';
import { PHASES, createGame, startGame, updateGame } from '../js/modules/game.js';

const IDLE = { turn: 0, forward: 0, thrust: false };
const DT = 1 / 30;

function countKind(game, kind) {
  return game.eggs.filter((egg) => egg.kind === kind).length;
}

describe('game', () => {
  it('waits in the ready phase until started', () => {
    const game = createGame(1);
    assert.equal(game.phase, PHASES.ready);
    assert.deepEqual(updateGame(game, IDLE, DT), []);
  });

  it('spawns a full set of eggs on start', () => {
    const game = createGame(1);
    startGame(game);
    assert.equal(game.phase, PHASES.playing);
    assert.equal(countKind(game, EGG_KINDS.normal), EGGS.normalCount);
    assert.equal(countKind(game, EGG_KINDS.golden), EGGS.goldenMax);
    assert.equal(game.timeLeft, GAME_DURATION);
  });

  it('scores an egg touched by the dino and replaces it', () => {
    const game = createGame(1);
    startGame(game);
    const { player } = game;
    game.eggs.push(createEgg(999, EGG_KINDS.normal, { x: player.x, y: player.y + 1, z: player.z }));
    const events = updateGame(game, IDLE, DT);
    const eggEvent = events.find((event) => event.type === 'egg');
    assert.ok(eggEvent);
    assert.equal(game.score.points, 1);
    assert.equal(countKind(game, EGG_KINDS.normal), EGGS.normalCount);
    assert.ok(!game.eggs.some((egg) => egg.id === 999));
  });

  it('plays a full game until time runs out, then ends once', () => {
    const game = createGame(2);
    startGame(game);
    const allEvents = [];
    const steps = Math.ceil(GAME_DURATION / DT) + 10;
    for (let i = 0; i < steps; i += 1) {
      const thrust = i % 120 < 50; // hop around
      allEvents.push(...updateGame(game, { turn: 0.3, forward: 1, thrust }, DT));
    }
    assert.equal(game.phase, PHASES.over);
    assert.equal(game.timeLeft, 0);
    assert.equal(allEvents.filter((event) => event.type === 'over').length, 1);
    assert.equal(allEvents.filter((event) => event.type === 'tick').length, FINAL_COUNTDOWN);
    assert.ok(allEvents.some((event) => event.type === 'landed'));
    assert.deepEqual(updateGame(game, IDLE, DT), []);
  });

  it('restarts cleanly', () => {
    const game = createGame(3);
    startGame(game);
    game.score.points = 50;
    game.timeLeft = 0;
    startGame(game);
    assert.equal(game.score.points, 0);
    assert.equal(game.timeLeft, GAME_DURATION);
  });

  it('respawns golden eggs after they expire', () => {
    const game = createGame(4);
    startGame(game);
    let expiredCount = 0;
    for (let t = 0; t < EGGS.goldenLifetime + EGGS.goldenRespawnDelay + 0.5; t += DT) {
      expiredCount += updateGame(game, IDLE, DT).filter((event) => event.type === 'eggExpired').length;
    }
    assert.ok(expiredCount >= 1);
    assert.ok(countKind(game, EGG_KINDS.golden) >= 1);
  });

  it('builds the combo in the air through updateGame and resets it on landing', () => {
    const game = createGame(5);
    startGame(game);
    const { player } = game;
    player.y += 10;
    player.grounded = false;
    const gains = [];
    for (let i = 0; i < 3; i += 1) {
      game.eggs.push(createEgg(1000 + i, EGG_KINDS.normal, { x: player.x, y: player.y + 1, z: player.z }));
      const event = updateGame(game, IDLE, DT).find((e) => e.type === 'egg');
      gains.push(event.gained);
    }
    assert.deepEqual(gains, [1, 2, 3]);

    let landed;
    for (let i = 0; i < 200 && !landed; i += 1) landed = updateGame(game, IDLE, DT).find((e) => e.type === 'landed');
    assert.equal(landed.lostChain, 3);
    assert.equal(game.score.chain, 0);
  });

  it('counts an egg grabbed on the touchdown frame as airborne', () => {
    const game = createGame(6);
    startGame(game);
    const { player } = game;
    const groundY = player.y;
    player.y = groundY + 0.05;
    player.vy = -5;
    player.grounded = false;
    game.score.chain = 2;
    game.eggs.push(createEgg(2000, EGG_KINDS.normal, { x: player.x, y: groundY + 1, z: player.z }));
    const events = updateGame(game, IDLE, DT);
    assert.ok(events.some((e) => e.type === 'landed'));
    assert.equal(events.find((e) => e.type === 'egg').multiplier, 3);
  });
});
