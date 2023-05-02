import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";
import { loadShaders, Shaders } from "./shaders";

const gridSize = 64;
interface SceneData {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  gui: GUI;
  velocityFramebuffer1: THREE.WebGLRenderTarget;
  velocityFramebuffer2: THREE.WebGLRenderTarget;
  fluidSimulationMaterial: THREE.ShaderMaterial;
  prevTime: number;
}

export interface FluidSimData {
  sceneData: SceneData;
  shaders: Shaders;
  smokeDensityTexture: THREE.DataTexture;
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

  const gui = new GUI();
  const shaders = await loadShaders();

  const velocityFramebuffer1 = create2DFrameBufferWithMultipleTargets(
    gridSize,
    gridSize,
    gridSize
  );
  const velocityFramebuffer2 = create2DFrameBufferWithMultipleTargets(
    gridSize,
    gridSize,
    gridSize
  );

  const initialSmokeDensity = new Float32Array(64 * 64 * 64);
  const halfGridSize = 32;
  for (let z = 0; z < 64; z++) {
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const index = x + y * 64 + z * 64 * 64;
        const distance = Math.sqrt(
          Math.pow(x - halfGridSize, 2) +
            Math.pow(y - halfGridSize, 2) +
            Math.pow(z - halfGridSize, 2)
        );
        initialSmokeDensity[index] = distance < 8 ? 1.0 : 0.0;
      }
    }
  }

  const smokeDensityTexture = createSmokeDensityTexture(
    new THREE.Vector3(64, 64, 64)
  );

  // Create a new material for the smoke
  const smokeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_smokeDensityTexture: { value: smokeDensityTexture },
    },
    vertexShader: shaders.smokeVertexShader, // You need to create this shader
    fragmentShader: shaders.smokeFragmentShader, // You need to create this shader
    transparent: true,
  });

  const fluidSimulationShader = shaders.fluidSimulation;

  const fluidSimulationMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_deltaTime: { value: 0 },
      u_gridSize: { value: new THREE.Vector3(64, 64, 64) },
      u_velocityTexture: { value: velocityFramebuffer1.texture },
      u_resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      u_smokeDensityTexture: { value: smokeDensityTexture },
    },
    vertexShader: fluidSimulationShader.vertexShader,
    fragmentShader: fluidSimulationShader.fragmentShader,
    glslVersion: THREE.GLSL3,
  });

  const smokeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const smokeMesh = new THREE.Mesh(smokeGeometry, smokeMaterial);
  scene.add(smokeMesh);

  const sceneData: SceneData = {
    scene,
    camera,
    renderer,
    controls,
    gui,
    velocityFramebuffer1,
    velocityFramebuffer2,
    fluidSimulationMaterial,
    prevTime: 0,
  };

  return { sceneData, shaders, smokeDensityTexture };
}

export function updateScene(
  time: number,
  delta: number,
  fluidSimData: FluidSimData
): void {
  const sceneData = fluidSimData.sceneData;

  // Update fluid simulation uniforms
  sceneData.fluidSimulationMaterial.uniforms.u_time.value = time;
  sceneData.fluidSimulationMaterial.uniforms.u_deltaTime.value = delta;

  // Render fluid simulation to the render target
  sceneData.renderer.setRenderTarget(sceneData.velocityFramebuffer2);
  sceneData.renderer.render(sceneData.scene, sceneData.camera);

  // Swap the velocity textures and update the uniform
  const temp = sceneData.velocityFramebuffer1;
  sceneData.velocityFramebuffer1 = sceneData.velocityFramebuffer2;
  sceneData.velocityFramebuffer2 = temp;
  sceneData.fluidSimulationMaterial.uniforms.u_velocityTexture.value =
    sceneData.velocityFramebuffer1.texture;

  // Render the scene to the screen
  sceneData.renderer.setRenderTarget(null);
  sceneData.renderer.render(sceneData.scene, sceneData.camera);

  // Update the controls
  sceneData.controls.update();

  // Update prevTime
  sceneData.prevTime = time;
}

function createSmokeDensityTexture(gridSize: THREE.Vector3): THREE.DataTexture {
  const data = new Uint8Array(gridSize.x * gridSize.y * gridSize.z);
  const center = gridSize.clone().multiplyScalar(0.5);

  for (let z = 0; z < gridSize.z; z++) {
    for (let y = 0; y < gridSize.y; y++) {
      for (let x = 0; x < gridSize.x; x++) {
        const index = x + y * gridSize.x + z * gridSize.x * gridSize.y;
        const position = new THREE.Vector3(x, y, z);
        const distance = position.distanceTo(center);

        data[index] = distance < 5.0 ? 255 : 0;
      }
    }
  }

  const texture = new THREE.DataTexture(
    data,
    gridSize.x,
    gridSize.y,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

export function addSmoke(
  fluidSimData: FluidSimData,
  x: number,
  y: number,
  radius: number
) {
  console.log("add smoke: ", x, y, radius);
  const gridSize =
    fluidSimData.sceneData.fluidSimulationMaterial.uniforms.u_gridSize.value;
  const data = fluidSimData.smokeDensityTexture.image.data;

  for (let z = 0; z < gridSize.z; z++) {
    for (let j = 0; j < gridSize.y; j++) {
      for (let i = 0; i < gridSize.x; i++) {
        const index = i + j * gridSize.x + z * gridSize.x * gridSize.y;
        const position = new THREE.Vector3(i, j, z);
        const clickPosition = new THREE.Vector3(x, y, gridSize.z * 0.5);
        const distance = position.distanceTo(clickPosition);

        if (distance < radius) {
          data[index] = 255;
        }
      }
    }
  }

  fluidSimData.smokeDensityTexture.needsUpdate = true;
}

function create2DFrameBufferWithMultipleTargets(width, height, depth) {
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: false,
  });

  const dataTextures = [];

  for (let i = 0; i < depth; i++) {
    const dataTexture = new THREE.DataTexture(
      new Float32Array(width * height * 4),
      width,
      height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    dataTexture.minFilter = THREE.LinearFilter;
    dataTexture.magFilter = THREE.LinearFilter;
    dataTexture.wrapS = THREE.ClampToEdgeWrapping;
    dataTexture.wrapT = THREE.ClampToEdgeWrapping;
    dataTextures.push(dataTexture);
  }

  renderTarget.texture = new THREE.DataArrayTexture(dataTextures);
  return renderTarget;
}

function create2DArrayTexture(width, height, layers) {
  const data = new Float32Array(width * height * layers * 4);
  const texture = new THREE.DataArrayTexture(data, width, height, layers);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.FloatType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
