import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";

interface SceneData {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  walls: THREE.Mesh[];
  gui: GUI;
}

export function init(): SceneData {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  camera.position.set(5, 5, 5);
  controls.update();

  const walls = createWalls();
  walls.forEach((wall) => scene.add(wall));

  const gui = setupGUI(walls);

  return { scene, camera, renderer, controls, walls, gui };
}

export function renderScene({
  scene,
  camera,
  renderer,
  controls,
}: SceneData): void {
  const animate = () => {
    requestAnimationFrame(animate);

    controls.update();

    renderer.render(scene, camera);
  };

  animate();
}

function createWalls(): THREE.Mesh[] {
  const geometry = new THREE.BoxGeometry(10, 10, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x808080 });
  const wall1 = new THREE.Mesh(geometry, material);
  const wall2 = wall1.clone();
  const wall3 = wall1.clone();

  wall1.position.set(0, 0, -5);
  wall2.rotation.y = Math.PI / 2;
  wall2.position.set(-5, 0, 0);
  wall3.rotation.y = -Math.PI / 2;
  wall3.position.set(5, 0, 0);

  return [wall1, wall2, wall3];
}

function setupGUI(walls: THREE.Mesh[]): GUI {
  const gui = new GUI();
  const wallColors = {
    color1: "#808080",
    color2: "#808080",
    color3: "#808080",
  };

  gui.addColor(wallColors, "color1").onChange((color) => {
    (walls[0].material as THREE.MeshBasicMaterial).color.set(color);
  });

  gui.addColor(wallColors, "color2").onChange((color) => {
    (walls[1].material as THREE.MeshBasicMaterial).color.set(color);
  });

  gui.addColor(wallColors, "color3").onChange((color) => {
    (walls[2].material as THREE.MeshBasicMaterial).color.set(color);
  });

  return gui;
}

function resetCamera(camera: THREE.PerspectiveCamera) {
  camera.position.set(5, 5, 5);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

export function handleKeyPress(
  { camera }: SceneData,
  event: KeyboardEvent
): void {
  if (event.code === "Space") {
    resetCamera(camera);
  }
}
