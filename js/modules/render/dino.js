import * as THREE from '../../../vendor/three/three.module.js';
import { lerp } from '../math.js';

const PALETTE = Object.freeze({
  skin: 0x4cc163,
  belly: 0xf4e3a3,
  spikes: 0x2f9b57,
  eyeWhite: 0xffffff,
  pupil: 0x222233,
  pack: 0xff7f3f,
  metal: 0x6b7a8f,
  flameOuter: 0xff6a2b,
  flameInner: 0xffe066,
});

function material(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function part(geometry, mat, x, y, z) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

function buildBody(mats) {
  const body = new THREE.Group();
  const torso = part(new THREE.IcosahedronGeometry(1, 0), mats.skin, 0, 1.3, 0);
  torso.scale.set(0.9, 1, 1.15);
  const belly = part(new THREE.IcosahedronGeometry(0.75, 0), mats.belly, 0, 1.15, 0.38);
  belly.scale.set(0.9, 1, 0.8);
  const head = part(new THREE.BoxGeometry(0.95, 0.8, 1.1), mats.skin, 0, 2.35, 0.6);
  const snout = part(new THREE.BoxGeometry(0.8, 0.45, 0.6), mats.skin, 0, 2.18, 1.35);
  const tail = part(new THREE.ConeGeometry(0.5, 1.9, 5), mats.skin, 0, 0.95, -1.4);
  tail.rotation.x = -Math.PI / 2 - 0.25;
  body.add(torso, belly, head, snout, tail);

  for (const side of [-1, 1]) {
    body.add(part(new THREE.BoxGeometry(0.22, 0.22, 0.12), mats.eyeWhite, side * 0.3, 2.55, 1.16));
    body.add(part(new THREE.BoxGeometry(0.11, 0.13, 0.06), mats.pupil, side * 0.3, 2.55, 1.24));
    const arm = part(new THREE.BoxGeometry(0.2, 0.2, 0.55), mats.skin, side * 0.62, 1.55, 0.75);
    arm.rotation.x = 0.4;
    body.add(arm);
  }

  const spikes = [
    { y: 2.42, z: -0.1, height: 0.45 },
    { y: 2.25, z: -0.55, height: 0.4 },
    { y: 1.95, z: -0.95, height: 0.35 },
  ];
  for (const spike of spikes) {
    body.add(part(new THREE.ConeGeometry(0.2, spike.height, 4), mats.spikes, 0, spike.y, spike.z));
  }
  return body;
}

function buildLegs(mats) {
  return [-1, 1].map((side) => {
    const leg = part(new THREE.BoxGeometry(0.38, 0.7, 0.5), mats.skin, side * 0.45, 0.35, 0.1);
    return leg;
  });
}

function buildJetpack(mats) {
  const pack = new THREE.Group();
  pack.add(part(new THREE.BoxGeometry(1.0, 1.1, 0.45), mats.pack, 0, 1.55, -0.95));
  const flames = [];
  for (const side of [-1, 1]) {
    pack.add(part(new THREE.CylinderGeometry(0.24, 0.24, 1.25, 7), mats.metal, side * 0.36, 1.5, -1.25));
    const nozzle = part(new THREE.CylinderGeometry(0.16, 0.26, 0.25, 7), mats.metal, side * 0.36, 0.78, -1.25);
    pack.add(nozzle);

    const flame = new THREE.Group();
    flame.position.set(side * 0.36, 0.66, -1.25);
    const outer = part(new THREE.ConeGeometry(0.24, 1, 7).translate(0, -0.5, 0), mats.flameOuter, 0, 0, 0);
    outer.rotation.x = Math.PI;
    outer.position.y = -1;
    const inner = part(new THREE.ConeGeometry(0.13, 0.6, 7).translate(0, -0.3, 0), mats.flameInner, 0, 0, 0);
    inner.rotation.x = Math.PI;
    inner.position.y = -0.6;
    flame.add(outer, inner);
    flame.visible = false;
    pack.add(flame);
    flames.push(flame);
  }
  return { pack, flames };
}

function createBlobShadow() {
  const geometry = new THREE.CircleGeometry(1.2, 16);
  geometry.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shadow.renderOrder = 1;
  return shadow;
}

/** Low poly dinosaur with a jetpack, built entirely from primitive shapes. */
export function createDino(scene) {
  const mats = {
    skin: material(PALETTE.skin),
    belly: material(PALETTE.belly),
    spikes: material(PALETTE.spikes),
    eyeWhite: material(PALETTE.eyeWhite),
    pupil: material(PALETTE.pupil),
    pack: material(PALETTE.pack),
    metal: material(PALETTE.metal),
    flameOuter: new THREE.MeshBasicMaterial({ color: PALETTE.flameOuter }),
    flameInner: new THREE.MeshBasicMaterial({ color: PALETTE.flameInner }),
  };

  const root = new THREE.Group();
  const tilt = new THREE.Group(); // leans forward with speed
  const body = buildBody(mats);
  const legs = buildLegs(mats);
  const { pack, flames } = buildJetpack(mats);
  tilt.add(body, pack, ...legs);
  root.add(tilt);
  scene.add(root);

  const shadow = createBlobShadow();
  scene.add(shadow);

  let walkPhase = 0;
  let lean = 0;

  return {
    /** Syncs the model with the player state. groundY is the surface right below the dino. */
    update(player, groundY, dt, time) {
      root.position.set(player.x, player.y, player.z);
      root.rotation.y = player.heading;

      const speed = Math.hypot(player.vx, player.vz);
      lean = lerp(lean, player.grounded ? 0 : Math.min(speed / 40, 0.35), Math.min(1, dt * 6));
      tilt.rotation.x = lean;

      const walking = player.grounded && speed > 0.5;
      walkPhase = walking ? walkPhase + dt * speed * 1.6 : 0;
      legs[0].rotation.x = Math.sin(walkPhase) * 0.6;
      legs[1].rotation.x = -Math.sin(walkPhase) * 0.6;
      tilt.position.y = walking ? Math.abs(Math.sin(walkPhase)) * 0.12 : 0;

      for (const [index, flame] of flames.entries()) {
        flame.visible = player.thrusting;
        if (player.thrusting) {
          const flicker = 0.8 + Math.sin(time * 40 + index * 2) * 0.15 + Math.random() * 0.1;
          flame.scale.set(1, flicker, 1);
        }
      }

      const height = Math.max(0, player.y - groundY);
      const shadowScale = Math.max(0.35, 1 - height / 30);
      shadow.position.set(player.x, groundY + 0.12, player.z);
      shadow.scale.setScalar(shadowScale);
      shadow.material.opacity = 0.28 * shadowScale;
    },
  };
}
