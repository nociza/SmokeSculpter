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

function createWalls(): THREE.Mesh[] {
  const geometry = new THREE.BoxGeometry(10, 10, 1);
  const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const wall1 = new THREE.Mesh(geometry, material);
  const wall2 = wall1.clone();
  const wall3 = wall1.clone();

  wall1.position.set(0, 0, -5);
  wall2.rotation.y = Math.PI / 2;
  wall2.position.set(-5, 0, 0);
  wall3.rotation.z = -Math.PI / 2;
  wall3.rotation.x = Math.PI / 2;
  wall3.position.set(0, -5, 0);

  return [wall1, wall2, wall3];
}

export function initScene(): SceneData {
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

  // Add spot lights to the scene
  const spotLight = new THREE.SpotLight(0xffffff, 0.5);
  spotLight.position.set(0, 10, 0);
  scene.add(spotLight);

  // Add ambient light to the scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const gui = setupGUI(walls, spotLight);

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

function setupGUI(walls: THREE.Mesh[], spotLight: THREE.SpotLight): GUI {
  const gui = new GUI();

  // Wall color picker (the label should say "Wall color")
  const wallColors = "rgb(128, 128, 128)";
  gui
    .addColor(new THREE.Color(wallColors), "r")
    .onChange((value) => {
      // parse color to hex and set it to the walls
      const { r, g, b } = parseColor(value);
      walls.forEach((wall) => {
        (wall.material as THREE.MeshBasicMaterial).color.setRGB(r, g, b);
      });
    })
    .name("Wall Color");

  // Spot light color picker
  const spotLightColor = "rgb(255, 255, 255)";
  gui
    .addColor(new THREE.Color(spotLightColor), "r")
    .onChange((value) => {
      const { r, g, b } = parseColor(value);
      spotLight.color.setRGB(r, g, b);
    })
    .name("Spot Light Color");
  // change the direction of the light using GUI
  gui.add(spotLight.position, "x", -10, 10);
  gui.add(spotLight.position, "y", -10, 10);
  gui.add(spotLight.position, "z", -10, 10);

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

/******************************************************************************
 *                            Helper functions                                *
 ******************************************************************************/
const parseColor = (value: number) => {
  const r = parseInt(value.toString(16).substring(0, 2), 16) / 255;
  const g = parseInt(value.toString(16).substring(2, 4), 16) / 255;
  const b = parseInt(value.toString(16).substring(4, 6), 16) / 255;
  return { r, g, b };
};
