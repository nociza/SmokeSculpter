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
  objects: THREE.Mesh[];
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

function createGrid(): THREE.GridHelper {
  const grid = new THREE.GridHelper(100, 40, 0xdddddd, 0xdddddd);
  grid.position.set(0, -5.5, 0);
  return grid;
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
  controls.minDistance = 10;
  controls.maxDistance = 60;
  controls.target.set(0, 0, 0);
  camera.position.set(5, 5, 5);
  controls.update();

  const objects = [];

  const walls = createWalls();
  walls.forEach((wall) => scene.add(wall));

  //add a mesh grid to the bottom
  const grid_floor = createGrid();
  scene.add(grid_floor)

  // Add spot lights to the scene
  const spotLight = new THREE.SpotLight(0xffffff, 0.5);
  spotLight.position.set(0, 10, 0);
  scene.add(spotLight);

  // Add ambient light to the scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);


  const gui = setupGUI(walls, spotLight, grid_floor);

  return { scene, camera, renderer, controls, walls, gui, objects };
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

function addNewObject(sceneDat: SceneData, mouseposition: any, event: KeyboardEvent): void {
  //https://stackoverflow.com/questions/47682260/three-js-draw-where-mouse-clicks-but-entirely-parallel-to-camera-orientation
  //something might be off
  console.log(mouseposition);
  const scene = sceneDat.scene;
  const camera = sceneDat.camera;
  var raycaster = new THREE.Raycaster();
  var plane = new THREE.Plane();
  var planeNormal = new THREE.Vector3();
  var point = new THREE.Vector3();
  var mouse = new THREE.Vector2(mouseposition.x, mouseposition.y);
  planeNormal.copy(camera.position).normalize();
  plane.setFromNormalAndCoplanarPoint(planeNormal, scene.position);
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, point);

  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const cube = new THREE.Mesh(geometry, material);

  cube.position.copy(point);
  sceneDat.objects.push(cube);
  scene.add(cube);
}

function setupGUI(walls: THREE.Mesh[], spotLight: THREE.SpotLight, grid: THREE.GridHelper): GUI {
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

  //toggle grid visibility
  gui.add(grid, "visible");

  return gui;
}

function resetCamera(camera: THREE.PerspectiveCamera) {
  camera.position.set(5, 5, 5);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

export function handleKeyPress(
  sceneData: SceneData,
  mouseposition: any,
  event: KeyboardEvent
): void {
  let camera = sceneData.camera;
  console.log(event);
  if (event?.code === "Space") {
    resetCamera(camera);
  }
  if (event?.code === "KeyN") {
    addNewObject(sceneData, mouseposition, event);
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