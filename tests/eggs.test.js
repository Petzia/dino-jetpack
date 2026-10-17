import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EGGS, WORLD } from '../js/modules/config.js';
import { EGG_KINDS, ageEggs, createEgg, eggPoints, findCollectedEggs, generateSpawnPoints, pickSpawnPoint } from '../js/modules/eggs.js';
import { createRng } from '../js/modules/random.js';
import { FLOATING_ROCKS, isOverRock, rockBottom, terrainHeightAt } from '../js/modules/terrain.js';

describe('generateSpawnPoints', () => {
  const points = generateSpawnPoints(createRng(3));

  it('is deterministic for a seed', () => {
    assert.deepEqual(generateSpawnPoints(createRng(3)), points);
  });

  it('keeps every point inside the play area, above ground and under the ceiling', () => {
    for (const point of [...points.normal, ...points.golden]) {
      assert.ok(Math.hypot(point.x, point.z) < WORLD.playRadius);
      assert.ok(point.y > terrainHeightAt(point.x, point.z));
      assert.ok(point.y < WORLD.ceiling);
    }
  });

  it('never places an egg inside a floating rock', () => {
    for (const point of [...points.normal, ...points.golden]) {
      for (const rock of FLOATING_ROCKS) {
        const inside = isOverRock(rock, point.x, point.z, 1) && point.y > rockBottom(rock) - 1 && point.y < rock.top;
        assert.ok(!inside, `point ${JSON.stringify(point)} is inside a rock`);
      }
    }
  });

  it('places golden eggs high above the ground', () => {
    for (const point of points.golden) {
      assert.ok(point.y - terrainHeightAt(point.x, point.z) > 10);
    }
  });

  it('avoids trees', () => {
    const tree = { x: 0, z: 0, scale: 100 }; // a giant tree covering the island
    const { normal } = generateSpawnPoints(createRng(1), { trees: [tree] });
    assert.equal(normal.length, 0);
  });
});

describe('pickSpawnPoint', () => {
  const player = { x: 0, y: 0, z: 0 };

  it('avoids points near the player when possible', () => {
    const points = [{ x: 1, y: 1, z: 1 }, { x: 40, y: 1, z: 0 }];
    for (let seed = 0; seed < 20; seed += 1) {
      assert.equal(pickSpawnPoint(points, [], player, createRng(seed)).x, 40);
    }
  });

  it('falls back to a far point before a point next to the player', () => {
    const points = [{ x: 1, y: 1, z: 1 }, { x: 40, y: 1, z: 0 }];
    const alwaysNear = () => 0; // every random try picks the near point
    assert.equal(pickSpawnPoint(points, [], player, alwaysNear).x, 40);
  });

  it('never reuses an occupied point and returns null when full', () => {
    const points = [{ x: 40, y: 1, z: 0 }];
    const eggs = [createEgg(1, EGG_KINDS.normal, points[0])];
    assert.equal(pickSpawnPoint(points, eggs, player, createRng(1)), null);
  });
});

describe('egg lifecycle', () => {
  it('collects eggs within reach of the dino body', () => {
    const near = createEgg(1, EGG_KINDS.normal, { x: 1, y: 1.5, z: 0 });
    const far = createEgg(2, EGG_KINDS.normal, { x: 10, y: 1, z: 0 });
    const collected = findCollectedEggs([near, far], { x: 0, y: 0, z: 0 });
    assert.deepEqual(collected.map((egg) => egg.id), [1]);
  });

  it('expires golden eggs but never normal ones', () => {
    const golden = createEgg(1, EGG_KINDS.golden, { x: 0, y: 0, z: 0 });
    const normal = createEgg(2, EGG_KINDS.normal, { x: 0, y: 0, z: 0 });
    assert.deepEqual(ageEggs([golden, normal], EGGS.goldenLifetime - 0.1), []);
    assert.deepEqual(ageEggs([golden, normal], 0.2), [golden]);
  });

  it('gives golden eggs more points', () => {
    assert.ok(eggPoints(EGG_KINDS.golden) > eggPoints(EGG_KINDS.normal));
  });
});
