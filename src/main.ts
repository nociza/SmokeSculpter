import { initScene, handleKeyPress, updateScene } from "./scene";
import * as THREE from "three";

var mouseposition = { x: 0, y: 0 };

(async () => {
  const fluidSimData = await initScene();
  const sceneData = fluidSimData.sceneData;

  // Add an event listener for keypress events
  window.addEventListener("keypress", (event) => {
    handleKeyPress(sceneData, mouseposition, event);
  });

  // Track mouse position
  window.addEventListener("mousemove", (event) => {
    mouseposition.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseposition.y = -((event.clientY / window.innerHeight) * 2 - 1);
  });

  const clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    updateScene(elapsedTime, delta, fluidSimData);

    sceneData.renderer.render(sceneData.scene, sceneData.camera);
    sceneData.controls.update();
  };

  animate();
})();
