import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";
import { loadShaders, Shaders } from "./shaders";

interface SceneData {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  gui: GUI;
  velocityFramebuffer1: THREE.WebGLRenderTarget;
  velocityFramebuffer2: THREE.WebGLRenderTarget;
  velocityTexture1: THREE.Texture;
  velocityTexture2: THREE.Texture;
  fluidSimulationMaterial: THREE.ShaderMaterial;
  prevTime: number;
}

export interface FluidSimData {
  sceneData: SceneData;
  shaders: Shaders;
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

  const velocityTexture1 = velocityFramebuffer1.texture;
  const velocityTexture2 = velocityFramebuffer2.texture;

  const fluidSimulationShader = shaders.fluidSimulation;

  const fluidSimulationMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_deltaTime: { value: 0 },
      u_gridSize: { value: new THREE.Vector3(64, 64, 64) },
      u_velocityTexture: { value: velocityTexture1 },
      u_resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      }, // Add this line
    },
    vertexShader: fluidSimulationShader.vertexShader,
    fragmentShader: fluidSimulationShader.fragmentShader,
  });

  const fluidSimulationMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    fluidSimulationMaterial
  );
  scene.add(fluidSimulationMesh);

  const sceneData: SceneData = {
    scene,
    camera,
    renderer,
    controls,
    gui,
    velocityFramebuffer1,
    velocityFramebuffer2,
    velocityTexture1,
    velocityTexture2,
    fluidSimulationMaterial,
    prevTime: 0,
  };

  return { sceneData, shaders };
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

  // Swap the velocity framebuffers and update the uniform
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
