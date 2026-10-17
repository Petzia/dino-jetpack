import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WORLD } from '../js/modules/config.js';
import { FLOATING_ROCKS, surfaceHeightAt, terrainHeightAt } from '../js/modules/terrain.js';

describe('terrain', () => {
  it('is deterministic', () => {
    assert.equal(terrainHeightAt(12.5, -40), terrainHeightAt(12.5, -40));
  });

  it('is dry land everywhere inside the play area', () => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      for (let radius = 0; radius <= WORLD.playRadius; radius += 5) {
        const height = terrainHeightAt(Math.cos(angle) * radius, Math.sin(angle) * radius);
        assert.ok(height >= 1 - 1e-9, `height ${height} at r=${radius}`);
      }
    }
  });

  it('sinks under the sea past the island edge', () => {
    assert.ok(terrainHeightAt(WORLD.islandRadius + 5, 0) < 0);
  });

  it('keeps every floating rock reachable and above the ground', () => {
    for (const rock of FLOATING_ROCKS) {
      assert.ok(Math.hypot(rock.x, rock.z) + rock.radius < WORLD.playRadius);
      assert.ok(rock.top < WORLD.ceiling);
      assert.ok(rock.top - rock.thickness > terrainHeightAt(rock.x, rock.z) + 4, 'room to fly underneath');
    }
  });

  it('counts a rock top only when coming from above', () => {
    const rock = FLOATING_ROCKS[0];
    assert.equal(surfaceHeightAt(rock.x, rock.z, rock.top + 1), rock.top);
    assert.equal(surfaceHeightAt(rock.x, rock.z, 0), terrainHeightAt(rock.x, rock.z));
  });
});
