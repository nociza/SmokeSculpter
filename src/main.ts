import * as THREE from "three";
import { FluidSimData, initScene, updateScene, addSmoke } from "./scene";

let fluidSimData: FluidSimData;

(async () => {
  fluidSimData = await initScene();

  // Set the resolution uniform
  fluidSimData.sceneData.fluidSimulationMaterial.uniforms.u_resolution.value =
    new THREE.Vector2(window.innerWidth, window.innerHeight);

  animate(performance.now());

  // Add an event listener for the click event
  window.addEventListener("click", onClick);
})();

function animate(time: number) {
  requestAnimationFrame(animate);

  const delta = Math.min(0.1, time - fluidSimData.sceneData.prevTime);

  updateScene(time * 0.001, delta * 0.001, fluidSimData);

  fluidSimData.sceneData.prevTime = time;
}

// Add this function to handle the click event
function onClick(event: MouseEvent) {
  const x = Math.floor(
    (event.clientX / window.innerWidth) *
      fluidSimData.sceneData.fluidSimulationMaterial.uniforms.u_gridSize.value.x
  );
  const y = Math.floor(
    (event.clientY / window.innerHeight) *
      fluidSimData.sceneData.fluidSimulationMaterial.uniforms.u_gridSize.value.y
  );

  addSmoke(fluidSimData, x, y, 5);
}
