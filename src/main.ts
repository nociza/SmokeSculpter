import { initScene, renderScene, handleKeyPress } from "./scene";

const sceneData = initScene();
renderScene(sceneData);

// Add an event listener for keypress events
window.addEventListener("keypress", (event) => {
  handleKeyPress(sceneData, event);
});
