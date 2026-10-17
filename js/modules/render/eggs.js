import * as THREE from '../../../vendor/three/three.module.js';
import { EGGS } from '../config.js';
import { EGG_KINDS } from '../eggs.js';

const PASTELS = [0xfff3e0, 0xffc9d9, 0xbfe9ff, 0xe2d6ff, 0xd3f7c8, 0xffe9a8];
const BLINK_TIME = 2; // golden eggs blink during their last seconds

function createEggGeometry(size) {
  const geometry = new THREE.SphereGeometry(size, 7, 5);
  geometry.scale(1, 1.3, 1);
  return geometry;
}

/** Draws all eggs: normal ones in a single instanced draw call, golden ones with a light beam. */
export function createEggView(scene) {
  const normalMesh = new THREE.InstancedMesh(
    createEggGeometry(0.75),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    EGGS.normalCount + 4,
  );
  // Create the color buffer up front so the shader is compiled with instance colors.
  for (let i = 0; i < normalMesh.count; i += 1) normalMesh.setColorAt(i, new THREE.Color(0xffffff));
  normalMesh.count = 0;
  normalMesh.frustumCulled = false; // instances move around the whole island
  scene.add(normalMesh);

  const goldenMaterial = new THREE.MeshLambertMaterial({
    color: 0xffc93c,
    emissive: 0x8a5a00,
    flatShading: true,
  });
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe27a,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const goldenGeometry = createEggGeometry(0.95);
  const beamGeometry = new THREE.CylinderGeometry(0.35, 0.35, 60, 6, 1, true);
  const goldenViews = Array.from({ length: EGGS.goldenMax }, () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(goldenGeometry, goldenMaterial));
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.y = 30;
    group.add(beam);
    group.visible = false;
    scene.add(group);
    return group;
  });

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();

  function updateNormal(normals, time) {
    normalMesh.count = Math.min(normals.length, normalMesh.instanceMatrix.count);
    for (let i = 0; i < normalMesh.count; i += 1) {
      const egg = normals[i];
      position.set(egg.x, egg.y + Math.sin(time * 2 + egg.id) * 0.15, egg.z);
      quaternion.setFromAxisAngle(up, time + egg.id);
      matrix.compose(position, quaternion, scale);
      normalMesh.setMatrixAt(i, matrix);
      normalMesh.setColorAt(i, color.setHex(PASTELS[egg.id % PASTELS.length]));
    }
    normalMesh.instanceMatrix.needsUpdate = true;
    if (normalMesh.instanceColor) normalMesh.instanceColor.needsUpdate = true;
  }

  function updateGolden(goldens, time) {
    goldenViews.forEach((view, index) => {
      const egg = goldens[index];
      view.visible = Boolean(egg);
      if (!egg) return;
      const remaining = egg.lifetime - egg.age;
      const blinking = remaining < BLINK_TIME && Math.floor(time * 8) % 2 === 0;
      view.position.set(egg.x, egg.y + Math.sin(time * 3 + egg.id) * 0.25, egg.z);
      view.rotation.y = time * 2;
      view.children[0].visible = !blinking;
    });
  }

  return {
    update(eggs, time) {
      updateNormal(eggs.filter((egg) => egg.kind === EGG_KINDS.normal), time);
      updateGolden(eggs.filter((egg) => egg.kind === EGG_KINDS.golden), time);
    },
  };
}
