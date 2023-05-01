import * as THREE from "three";
import { FluidSimData, initScene, updateScene } from "./scene";

let fluidSimData: FluidSimData;

(async () => {
  fluidSimData = await initScene();

  // Set the resolution uniform
  fluidSimData.sceneData.fluidSimulationMaterial.uniforms.u_resolution.value =
    new THREE.Vector2(window.innerWidth, window.innerHeight);

  animate(performance.now());
})();

function animate(time: number) {
  requestAnimationFrame(animate);

  const delta = Math.min(0.1, time - fluidSimData.sceneData.prevTime);

  updateScene(time * 0.001, delta * 0.001, fluidSimData);

  fluidSimData.sceneData.prevTime = time;
}
