import * as THREE from '../../../vendor/three/three.module.js';
import { CAMERA } from '../config.js';
import { dampFactor, lerpAngle } from '../math.js';
import { chaseCameraTarget } from '../navigation.js';
import { FLOATING_ROCKS, terrainHeightAt } from '../terrain.js';

const MAX_PIXEL_RATIO = 1.5; // keeps phones with dense screens smooth

export function createRenderer(canvas) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: pixelRatio < 1.5, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.5, 260);

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    scene,
    camera,
    render: () => renderer.render(scene, camera),
  };
}

/** Third person camera that smoothly follows behind the dino. */
export function createChaseCamera(camera) {
  let heading = 0;
  const position = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let initialized = false;

  return {
    update(player, dt) {
      heading = initialized ? lerpAngle(heading, player.heading, dampFactor(CAMERA.followRate, dt)) : player.heading;
      const target = chaseCameraTarget(player, heading, terrainHeightAt, FLOATING_ROCKS);
      if (initialized) {
        const t = dampFactor(CAMERA.followRate * 1.5, dt);
        position.lerp(target.position, t);
        lookAt.lerp(target.lookAt, t);
      } else {
        position.copy(target.position);
        lookAt.copy(target.lookAt);
        initialized = true;
      }
      camera.position.copy(position);
      camera.lookAt(lookAt);
    },
    snap() {
      initialized = false;
    },
  };
}
