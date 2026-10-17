import * as THREE from '../../../vendor/three/three.module.js';
import { WORLD } from '../config.js';
import { createRng } from '../random.js';
import { generateBoulders, generateClouds } from '../scenery.js';
import { FLOATING_ROCKS, terrainHeightAt } from '../terrain.js';

export const SKY_COLOR = 0x9fdcff;

const TERRAIN_SEGMENTS = 72;

const COLORS = Object.freeze({
  sand: new THREE.Color(0xf3d98c),
  grassLight: new THREE.Color(0x8fd65a),
  grassDark: new THREE.Color(0x5db04a),
  rock: new THREE.Color(0xa38d7b),
  peak: new THREE.Color(0xf4f1ea),
  water: 0x3aa8dc,
  trunk: 0x8a5a3b,
  boulder: 0x9c9aa8,
  cloud: 0xffffff,
  floatingTop: 0x7fd05a,
  floatingRock: 0xb58c6c,
});

const FOLIAGE_TINTS = [0x3fa34d, 0x56b84a, 0x2f8f5b, 0x7cc243, 0xf2a541];

function colorForHeight(height, slope, jitter) {
  let color;
  if (height < 1.6) color = COLORS.sand;
  else if (height > 17) color = COLORS.peak;
  else if (height > 11 || slope > 0.55) color = COLORS.rock;
  else color = jitter > 0.5 ? COLORS.grassLight : COLORS.grassDark;
  return color.clone().offsetHSL(0, 0, (jitter - 0.5) * 0.06);
}

function createTerrain(rng) {
  const geometry = new THREE.PlaneGeometry(WORLD.size, WORLD.size, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    positions.setY(i, terrainHeightAt(positions.getX(i), positions.getZ(i)));
  }

  // Non-indexed geometry gives every triangle its own normal: the flat low poly look.
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();

  const flatPositions = flat.attributes.position;
  const normals = flat.attributes.normal;
  const colors = new Float32Array(flatPositions.count * 3);
  for (let i = 0; i < flatPositions.count; i += 3) {
    const height = (flatPositions.getY(i) + flatPositions.getY(i + 1) + flatPositions.getY(i + 2)) / 3;
    const slope = 1 - normals.getY(i);
    const color = colorForHeight(height, slope, rng());
    for (let v = 0; v < 3; v += 1) color.toArray(colors, (i + v) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return new THREE.Mesh(flat, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

function createWater() {
  const geometry = new THREE.CircleGeometry(400, 40);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshLambertMaterial({ color: COLORS.water });
  return new THREE.Mesh(geometry, material);
}

function placeInstances(mesh, items, transform) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  items.forEach((item, index) => {
    const { x, y, z, sx, sy, sz, rotation } = transform(item);
    position.set(x, y, z);
    quaternion.setFromAxisAngle(up, rotation);
    scale.set(sx, sy, sz);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function createTrees(trees) {
  const group = new THREE.Group();
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.22, 0.32, 1.4, 5).translate(0, 0.7, 0),
    new THREE.MeshLambertMaterial({ color: COLORS.trunk }),
    trees.length,
  );
  placeInstances(trunks, trees, (tree) => ({
    x: tree.x, y: tree.y - 0.1, z: tree.z, sx: tree.scale, sy: tree.scale, sz: tree.scale, rotation: tree.rotation,
  }));
  group.add(trunks);

  const pointy = trees.filter((tree) => !tree.round);
  const round = trees.filter((tree) => tree.round);
  const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const shapes = [
    { list: pointy, geometry: new THREE.ConeGeometry(1.3, 3, 6).translate(0, 2.6, 0) },
    { list: round, geometry: new THREE.IcosahedronGeometry(1.3, 0).translate(0, 2.4, 0) },
  ];
  for (const { list, geometry } of shapes) {
    if (list.length === 0) continue;
    const mesh = new THREE.InstancedMesh(geometry, foliageMaterial, list.length);
    placeInstances(mesh, list, (tree) => ({
      x: tree.x, y: tree.y - 0.1, z: tree.z, sx: tree.scale, sy: tree.scale, sz: tree.scale, rotation: tree.rotation,
    }));
    const color = new THREE.Color();
    list.forEach((tree, index) => {
      mesh.setColorAt(index, color.setHex(FOLIAGE_TINTS[Math.floor(tree.tint * FOLIAGE_TINTS.length)]));
    });
    group.add(mesh);
  }
  return group;
}

function createBoulders(boulders) {
  const mesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.8, 0),
    new THREE.MeshLambertMaterial({ color: COLORS.boulder, flatShading: true }),
    boulders.length,
  );
  placeInstances(mesh, boulders, (boulder) => ({
    x: boulder.x, y: boulder.y + 0.2 * boulder.scale, z: boulder.z,
    sx: boulder.scale, sy: boulder.scale * 0.7, sz: boulder.scale, rotation: boulder.rotation,
  }));
  return mesh;
}

function createClouds(clouds) {
  // Each cloud is three puffs side by side.
  const puffs = clouds.flatMap((cloud) => [
    { x: cloud.x, y: cloud.y, z: cloud.z, s: cloud.scale },
    { x: cloud.x + cloud.scale * 1.2, y: cloud.y - 0.4, z: cloud.z + 0.5, s: cloud.scale * 0.75 },
    { x: cloud.x - cloud.scale * 1.1, y: cloud.y - 0.5, z: cloud.z - 0.4, s: cloud.scale * 0.7 },
  ]);
  const mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: COLORS.cloud, flatShading: true }),
    puffs.length,
  );
  placeInstances(mesh, puffs, (puff) => ({
    x: puff.x, y: puff.y, z: puff.z, sx: puff.s, sy: puff.s * 0.6, sz: puff.s, rotation: 0,
  }));
  return mesh;
}

function createFloatingRocks() {
  const group = new THREE.Group();
  const topMaterial = new THREE.MeshLambertMaterial({ color: COLORS.floatingTop, flatShading: true });
  const rockMaterial = new THREE.MeshLambertMaterial({ color: COLORS.floatingRock, flatShading: true });
  for (const rock of FLOATING_ROCKS) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(rock.radius, rock.radius * 0.95, 0.6, 8), topMaterial);
    top.position.set(rock.x, rock.top - 0.3, rock.z);
    const body = new THREE.Mesh(new THREE.ConeGeometry(rock.radius * 0.95, rock.thickness * 2.2, 8), rockMaterial);
    body.rotation.x = Math.PI; // point down
    body.position.set(rock.x, rock.top - 0.6 - rock.thickness * 1.1, rock.z);
    group.add(top, body);
  }
  return group;
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xdff4ff, 0x6b8f4e, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(60, 100, 40);
  scene.add(sun);
}

/** Builds the static island scene: terrain, sea, decoration, lights and fog. */
export function buildWorld(scene, { trees, seed }) {
  const rng = createRng(seed + 7);
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, 70, 190);
  addLights(scene);
  scene.add(createTerrain(rng));
  scene.add(createWater());
  scene.add(createTrees(trees));
  scene.add(createBoulders(generateBoulders(rng)));
  scene.add(createFloatingRocks());
  const clouds = createClouds(generateClouds(rng));
  scene.add(clouds);
  return {
    update(dt) {
      clouds.rotation.y += dt * 0.004; // slow drift
    },
  };
}
