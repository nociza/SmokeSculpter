import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";
import { loadShaders, Shaders, createFullscreenQuad } from "./shaders";

interface SceneData {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  walls: THREE.Mesh[];
  gui: GUI;
  objects: THREE.Mesh[];
  // Fluid simulation
  velocityFramebuffer1: THREE.WebGLRenderTarget;
  velocityFramebuffer2: THREE.WebGLRenderTarget;
  pressureFramebuffer1: THREE.WebGLRenderTarget;
  pressureFramebuffer2: THREE.WebGLRenderTarget;
  divergenceFramebuffer: THREE.WebGLRenderTarget;
  velocityTexture1: THREE.Texture;
  velocityTexture2: THREE.Texture;
  pressureTexture1: THREE.Texture;
  pressureTexture2: THREE.Texture;
  divergenceTexture: THREE.Texture;
  fullscreenQuad: THREE.Mesh;
  iterations: number;
}

interface FluidSimData {
  sceneData: SceneData;
  shaders: Shaders;
}

export interface EulerianGrid {
  size: THREE.Vector3;
  data: Float32Array;
}

export function createEulerianGrid(size: THREE.Vector3): EulerianGrid {
  const data = new Float32Array(size.x * size.y * size.z * 4);
  return { size, data };
}

export async function initScene(): Promise<FluidSimData> {
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

  // create 3D eulerian grid
  const size = new THREE.Vector3(64, 64, 64);
  const grid = createEulerianGrid(size);

  const gui = new GUI();

  const gridController = {
    size: grid.size.x,
  };

  gui.add(gridController, "size", 0, 128, 1).onChange((value) => {
    console.log(value);
    grid.size.set(value, value, value);
  });

  const shaders = await loadShaders();

  // Create framebuffers and textures
  const renderTargetOptions = {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
  };

  const velocityFramebuffer1 = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    renderTargetOptions
  );
  const velocityFramebuffer2 = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    renderTargetOptions
  );
  const pressureFramebuffer1 = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    renderTargetOptions
  );
  const pressureFramebuffer2 = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    renderTargetOptions
  );
  const divergenceFramebuffer = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    renderTargetOptions
  );

  const velocityTexture1 = velocityFramebuffer1.texture;
  const velocityTexture2 = velocityFramebuffer2.texture;
  const pressureTexture1 = pressureFramebuffer1.texture;
  const pressureTexture2 = pressureFramebuffer2.texture;
  const divergenceTexture = divergenceFramebuffer.texture;

  const fullscreenQuad = createFullscreenQuad();

  const sceneData: SceneData = {
    scene,
    camera,
    renderer,
    controls,
    walls,
    gui,
    objects,
    // Add new properties
    velocityFramebuffer1,
    velocityFramebuffer2,
    pressureFramebuffer1,
    pressureFramebuffer2,
    divergenceFramebuffer,
    velocityTexture1,
    velocityTexture2,
    pressureTexture1,
    pressureTexture2,
    divergenceTexture,
    fullscreenQuad,
    iterations: 20,
  };

  return { sceneData, shaders };
}

export function updateScene(
  time: number,
  delta: number,
  fluidSimData: FluidSimData
): void {
  const sceneData = fluidSimData.sceneData;
  const shaders = fluidSimData.shaders;

  // 1. Advect velocity
  shaders.advection.uniforms.u_velocity.value = sceneData.velocityTexture1;
  sceneData.fullscreenQuad.material = shaders.advection;
  sceneData.scene.add(sceneData.fullscreenQuad);
  sceneData.renderer.setRenderTarget(sceneData.velocityFramebuffer2);
  sceneData.renderer.render(sceneData.scene, sceneData.camera);
  sceneData.scene.remove(sceneData.fullscreenQuad);
  swapTextures(sceneData, "velocity");

  // 2. Splat
  shaders.splat.uniforms.u_target.value = sceneData.velocityTexture1;
  sceneData.fullscreenQuad.material = shaders.splat;
  sceneData.scene.add(sceneData.fullscreenQuad);
  sceneData.renderer.setRenderTarget(sceneData.velocityFramebuffer2);
  sceneData.renderer.render(sceneData.scene, sceneData.camera);
  sceneData.scene.remove(sceneData.fullscreenQuad);
  swapTextures(sceneData, "velocity");

  // 3. Calculate divergence
  shaders.divergence.uniforms.u_velocity.value = sceneData.velocityTexture1;
  sceneData.fullscreenQuad.material = shaders.divergence;
  sceneData.scene.add(sceneData.fullscreenQuad);
  sceneData.renderer.setRenderTarget(sceneData.divergenceFramebuffer);
  sceneData.renderer.render(sceneData.scene, sceneData.camera);
  sceneData.scene.remove(sceneData.fullscreenQuad);

  // 4. Solve pressure
  for (let i = 0; i < sceneData.iterations; i++) {
    shaders.pressure.uniforms.u_pressure.value = sceneData.pressureTexture1;
    shaders.pressure.uniforms.u_divergence.value = sceneData.divergenceTexture;
    sceneData.fullscreenQuad.material = shaders.pressure;
    sceneData.scene.add(sceneData.fullscreenQuad);
    sceneData.renderer.setRenderTarget(sceneData.pressureFramebuffer2);
    sceneData.renderer.render(sceneData.scene, sceneData.camera);
    sceneData.scene.remove(sceneData.fullscreenQuad);
    swapTextures(sceneData, "pressure");
  }

  // 5. Subtract gradient
  shaders.gradientSubtract.uniforms.u_pressure.value =
    sceneData.pressureTexture1;
  shaders.gradientSubtract.uniforms.u_velocity.value =
    sceneData.velocityTexture1;
  sceneData.fullscreenQuad.material = shaders.gradientSubtract;
  sceneData.scene.add(sceneData.fullscreenQuad);
  sceneData.renderer.setRenderTarget(sceneData.velocityFramebuffer2);
  sceneData.renderer.render(sceneData.scene, sceneData.camera);
  sceneData.scene.remove(sceneData.fullscreenQuad);
  swapTextures(sceneData, "velocity");

  sceneData.renderer.setRenderTarget(null);
  sceneData.renderer.render(sceneData.scene, sceneData.camera);
}

function swapTextures(sceneData: SceneData, type: string): void {
  if (type === "velocity") {
    [sceneData.velocityTexture1, sceneData.velocityTexture2] = [
      sceneData.velocityTexture2,
      sceneData.velocityTexture1,
    ];
    [sceneData.velocityFramebuffer1, sceneData.velocityFramebuffer2] = [
      sceneData.velocityFramebuffer2,
      sceneData.velocityFramebuffer1,
    ];
  } else if (type === "pressure") {
    [sceneData.pressureTexture1, sceneData.pressureTexture2] = [
      sceneData.pressureTexture2,
      sceneData.pressureTexture1,
    ];
    [sceneData.pressureFramebuffer1, sceneData.pressureFramebuffer2] = [
      sceneData.pressureFramebuffer2,
      sceneData.pressureFramebuffer1,
    ];
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

function createShaderMaterial(
  vertexShader: string,
  fragmentShader: string,
  uniforms: any
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
}

async function loadShaderFile(shaderPath: string): Promise<string> {
  const response = await fetch(shaderPath);
  return response.text();
}

function addNewObject(
  sceneDat: SceneData,
  mouseposition: any,
  event: KeyboardEvent
): void {
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

function resetCamera(camera: THREE.PerspectiveCamera) {
  camera.position.set(5, 5, 5);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
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
