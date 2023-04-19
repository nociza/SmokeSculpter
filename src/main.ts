import * as THREE from "three";

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;

export function init(): void {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create walls
  const wallGeometry = new THREE.BoxGeometry(1, 5, 5);
  const wallMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
  });

  const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
  wall1.position.set(0, 0, -2.5);
  scene.add(wall1);

  const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
  wall2.position.set(-2.5, 0, 0);
  wall2.rotation.y = Math.PI / 2;
  scene.add(wall2);

  const wall3 = new THREE.Mesh(wallGeometry, wallMaterial);
  wall3.position.set(2.5, 0, 0);
  wall3.rotation.y = -Math.PI / 2;
  scene.add(wall3);

  camera.position.set(3, 3, 3);
  camera.lookAt(0, 0, 0);
}

export function animate(): void {
  renderer.render(scene, camera);
}
